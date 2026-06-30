import { getCachedMedicine, setCachedMedicine, getExtractionData, setExtractionData, getUserMedicines } from "../medCache";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const interactionCache = new Map<string, any>();

// Initialize Gemini safely with telemetry header
const getAvailableKeys = () => {
  const rawKeys = [
    { name: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY }
  ];
  
  const keys: string[] = [];
  rawKeys.forEach((k) => {
    if (k.value && k.value.trim() !== '' && !k.value.includes('MY_GEMINI_API_KEY')) {
      const val = k.value.trim();
      keys.push(val);
      const masked = val.length > 10 ? val.substring(0, 6) + '...' + val.slice(-4) : '***';
      console.log(`[GEMINI KEYS] Successfully detected and loaded secret "${k.name}" (Masked: ${masked})`);
    } else {
      console.log(`[GEMINI KEYS] Secret "${k.name}" is empty or has a default placeholder.`);
    }
  });
  return keys;
};

// Execute operations using key rotation for maximum reliability and uptime
async function runWithRotation<T>(
  context: 'chat' | 'extraction' | 'interaction',
  operation: (ai: GoogleGenAI) => Promise<T>
): Promise<T> {
  const keys = getAvailableKeys();
  if (keys.length === 0) {
    throw new Error("No Gemini API Key is configured in your environment. Please configure GEMINI_API_KEY in your secrets.");
  }

  let lastError: any = null;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      return await operation(ai);
    } catch (err: any) {
      const msg = err.message || String(err);
      console.warn(`[GEMINI ROTATION] Key ${i + 1}/${keys.length} failed with error: ${msg.substring(0, 150)}. Trying next available key...`);
      lastError = err;
    }
  }

  throw new Error(getDetailedError(lastError, context));
}

// Error formatter
const getDetailedError = (error: any, context: 'chat' | 'extraction' | 'interaction') => {
  const msg = error.message || String(error);
  const msgLower = msg.toLowerCase();
  if (
    msgLower.includes('exceeded its monthly spending cap') || 
    msgLower.includes('spending cap') || 
    msgLower.includes('resource_exhausted') || 
    msgLower.includes('quota') || 
    msgLower.includes('billing') || 
    msgLower.includes('limit exceeded')
  ) {
    return "Your project has exceeded its monthly spending cap or quota in Google AI Studio.";
  }
  if (msg.includes('400')) {
    if (context === 'extraction') {
      return "Gemini Image Error (400). The AI had trouble processing this specific image. Please try a clearer, closer photo with better lighting.";
    }
    return `Gemini Request Error (400). The AI had trouble processing your request. Please check your inputs or try again.`;
  }
  if (msg.includes('403') || msgLower.includes('denied') || msgLower.includes('permission_denied')) {
    return "Your Google AI Studio Project has been restricted or denied access (403 PERMISSION_DENIED). Please verify that your active GEMINI_API_KEY is correct, enabled, and linked to a project in good standing with active billing/quota in Google AI Studio. If you recently configured Cloudflare, ensure API headers and payloads are not being modified or intercepted.";
  }
  if (msg.includes('404')) return "Gemini Model Not Found (404). Please ensure the requested model is valid.";
  if (msg.includes('429')) return "Gemini Quota Exceeded (429). You are on the free tier. Please wait a minute before trying again.";
  return msg;
};

const SYSTEM_INSTRUCTION = `You are Dr. DawaLens, an incredibly friendly, exceptionally empathetic, and highly knowledgeable companion and family physician. Your role is to guide patients through their medication inventory with pristine care, a very warm tone, and deep understanding.

CRITICAL INSTRUCTIONS:
1. INVENTORY SCAN: You have direct access to the user's "Patient Profile & Storage Context". When the user asks about an ailment (e.g., "I have a headache") or a category (e.g., "What painkillers do I have?"), you MUST perform a meticulous scan of their 'User's Stored Medicines'.
2. BE EXHAUSTIVE: If a user asks what they have, list ALL relevant medicines found in their inventory. Never say "I don't see any" unless you have double-checked the exact names provided in the context.
3. ADVICE STRUCTURE: 
   - First, tell them exactly what they already have that can help.
   - Second, provide professional advice on how to use it safely.
   - Third, only if they have nothing relevant, suggest standard over-the-counter options.
4. TONE: Exceptionally friendly, conversational, comforting, and supportive. Greet the user with warmth, show deep concern for their health, use highly encouraging words, and keep the dialogue light and engaging like a trusted, caring family doctor. Use Markdown for structured lists and bolding key terms.
5. NO REPETITIVE DISCLAIMERS: A mandatory safety disclaimer is shown in the UI daily. Do not add "I am an AI..." or "Consult a doctor..." to EVERY message. Only include it if giving high-risk advice.
6. CONTEXT AWARENESS: Always prioritize the medicines the user already owns. Treat the provided inventory as the absolute source of truth for their 'vault'.

GUIDELINES:
1. GREETING:
   - If user ask questions then give answer remove greeeting.
   - If the user starts with a simple greeting (e.g., "Hi", "Hello", "How are you?"), reply briefly with a friendly, single-sentence greeting and ask how you can help.
   - For all other queries (i.e., medical questions, product questions), reply directly and immediately to the user's query. Do not add any extra conversational text.
   - Always start with a friendly greeting if it is the very first message.
2. TONE & LANGUAGE:
   - Be empathetic, polite, and respectful. Use emojis (💊, 🌿, 😊, 🙏) to make the conversation warm.
   - Use bold text (**) for key medicine names, headings, and important warnings.
   - **HINGLISH SUPPORT**: If a user selects 'Hinglish' or types in a mix of Hindi and English, you MUST respond in Hinglish. Hinglish is Hindi language written in English script (Roman script), mixed with English medical/technical terms (e.g., "Aapko ye **Paracetamol** din mein do baar khani hai khana khane ke baad. Agar fever kam nahi hota toh doctor se consult karein.").
   - For other languages, follow the requested translation strictly but maintain the professional pharmacist persona.
3. MEDICAL QUERIES:
   - Provide clear, point-wise advice.
   - Format:
     1. **[Medicine Name/Remedy]**
     2. Usage Instructions
     3. Dietary Tip
     4. **Warning**
   - Keep it concise but helpful.
   - Keep Answer short and clean, aiming for less lines maximum.`;

// Extraction Cache logic
export async function getExtractionCache(imageHash: string) {
  try {
    const row = await getExtractionData(imageHash) as { data: string } | undefined;
    if (row) {
      return { found: true, data: JSON.parse(row.data) };
    }
  } catch (err) {
    console.warn("Failed to get extraction cache:", err);
  }
  return { found: false };
}

export async function saveExtractionCache(imageHash: string, data: any) {
  try {
    await setExtractionData(imageHash, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to set extraction cache:", err);
  }

  if (data.success && data.medicine) {
    const { name, dosage, usageInstructions, schedule, form } = data.medicine;
    try {
      await setCachedMedicine(
        (name || 'Unknown').toLowerCase().trim(), 
        dosage || 'N/A', 
        usageInstructions || '', 
        schedule || '', 
        form || 'other'
      );
    } catch (err) {
      console.warn("Failed to cache medicine:", err);
    }
  }
}

// Interaction Cache logic
export async function getInteractionCache(key: string) {
  if (interactionCache.has(key)) {
    return { found: true, data: interactionCache.get(key) };
  }
  return { found: false };
}

export async function saveInteractionCache(key: string, data: any) {
  interactionCache.set(key, data);
}

// Actual Gemini API logic on Server
export async function extractMedicineDataServer(base64Image: string) {
  try {
    return await runWithRotation('extraction', async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { 
            text: `You are a medical data extraction expert. 
            Perform exhaustive OCR to extract all visible text from the packaging.
            Then, identify:
            - Name: Medicine name.
            - Dosage: Strength.
            - Expiration Date: Format YYYY-MM-01 (use the 1st day of the month, e.g. 2026-05-01 if May 2026 is given).
            - Usage Instructions: Daily frequency/instructions.
            - Form: tablet, capsule, syrup, ampule, powder, liquid, or other.
            - Quantity: Number of units.` 
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              dosage: { type: Type.STRING },
              expirationDate: { type: Type.STRING },
              usageInstructions: { type: Type.STRING },
              form: { type: Type.STRING, enum: ["tablet", "capsule", "syrup", "ampule", "powder", "tape", "liquid", "other"] },
              quantity: { type: Type.NUMBER }
            },
            required: ["name", "dosage", "expirationDate", "form"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("AI returned empty response");
      
      const result = JSON.parse(text);
      return { success: true, medicine: result };
    });
  } catch (error: any) {
    console.error("Server extraction error:", error);
    return { success: false, errorMessage: error.message || String(error) };
  }
}

export async function checkDrugInteractionsServer(medicines: { name: string; dosage: string }[]) {
  try {
    return await runWithRotation('interaction', async (ai) => {
      const prompt = `Act as a medical expert. Check for drug-drug interactions between these medications: ${medicines.map(m => `${m.name} (${m.dosage})`).join(', ')}. 
      Return JSON: { hasInteractions: boolean, interactions: [{ medications: string[], severity: "low"|"moderate"|"high", description: string, recommendation: string }], generalAdvice: string }`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasInteractions: { type: Type.BOOLEAN },
              interactions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    medications: { type: Type.ARRAY, items: { type: Type.STRING } },
                    severity: { type: Type.STRING, enum: ["low", "moderate", "high"] },
                    description: { type: Type.STRING },
                    recommendation: { type: Type.STRING }
                  },
                  required: ["medications", "severity", "description", "recommendation"]
                }
              },
              generalAdvice: { type: Type.STRING }
            },
            required: ["hasInteractions", "interactions", "generalAdvice"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("AI returned empty response");
      return JSON.parse(text);
    });
  } catch (error: any) {
    console.error("Server interaction check error:", error);
    throw error;
  }
}

export async function chatWithGeminiServer(messages: any[], userId?: string, medicines?: any[]) {
  try {
    let userMedicinesContext = "";
    
    if (medicines && Array.isArray(medicines) && medicines.length > 0) {
      const medsStr = medicines.map(m => `- ${m.name} (${m.dosage || 'Dosage: N/A'}, Form: ${m.form || 'N/A'}, Expiry: ${m.expirationDate || 'N/A'}, Qty: ${m.quantity || 'N/A'})`).join('\n');
      userMedicinesContext = `\n\nCURRENT USER MEDICINES IN VAULT:\n${medsStr}\n\nAlways check and refer to this list to answer about the user's active medicines. If they ask about what they have, or ask for a remedy, meticulously check if they have it here first.`;
    } else if (userId) {
      try {
        const meds = await getUserMedicines(userId);
        if (meds && meds.length > 0) {
          const medsStr = meds.map(m => `- ${m.name} (${m.dosage || 'Dosage: N/A'}, Form: ${m.form || 'N/A'}, Expiry: ${m.expirationDate || 'N/A'}, Qty: ${m.quantity || 'N/A'})`).join('\n');
          userMedicinesContext = `\n\nCURRENT USER MEDICINES IN VAULT:\n${medsStr}\n\nAlways check and refer to this list to answer about the user's active medicines. If they ask about what they have, or ask for a remedy, meticulously check if they have it here first.`;
        } else {
          userMedicinesContext = `\n\nCURRENT USER MEDICINES IN VAULT: No medicines found.`;
        }
      } catch (err) {
        console.warn("Error fetching user medicines for chatbot context (permissions or offline), proceeding without database sync:", err);
        userMedicinesContext = `\n\nCURRENT USER MEDICINES IN VAULT: Database temporary sync unavailable.`;
      }
    } else {
      userMedicinesContext = `\n\nCURRENT USER MEDICINES IN VAULT: No medicines found.`;
    }

    const systemInstructionWithMeds = SYSTEM_INSTRUCTION + userMedicinesContext;

    return await runWithRotation('chat', async (ai) => {
      const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          ...history,
          { role: 'user', parts: [{ text: messages[messages.length - 1].content }] }
        ],
        config: {
          systemInstruction: systemInstructionWithMeds
        }
      });

      return response.text || "I'm sorry, I couldn't generate a response.";
    });
  } catch (error: any) {
    console.error("Server chat error:", error);
    throw error;
  }
}
