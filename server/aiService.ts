import { getCachedMedicine, setCachedMedicine, getExtractionData, setExtractionData, getUserMedicines } from "../medCache.ts";
import { GoogleGenAI, Type } from "@google/genai";

const interactionCache = new Map<string, any>();

/**
 * Loads the single canonical Gemini API key from environment variables.
 */
export const getGeminiApiKey = (): string => {
  const envVal = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  const trimmed = envVal.trim().replace(/^['"]+|['"]+$/g, '');
  
  if (trimmed && !trimmed.includes('MY_GEMINI_API_KEY') && !trimmed.includes('YOUR_API_KEY')) {
    return trimmed;
  }
  return '';
};

// Backwards-compatible single-key loader
export const getAvailableKeys = (): string[] => {
  const key = getGeminiApiKey();
  if (key) {
    const masked = key.length > 10 ? key.substring(0, 6) + '...' + key.slice(-4) : '***';
    console.log(`[GEMINI API] Initialized with single GEMINI_API_KEY (Masked: ${masked})`);
    return [key];
  }
  console.warn('[GEMINI API] Warning: GEMINI_API_KEY is not configured in environment variables.');
  return [];
};

// Execute operations using the single Gemini API instance
async function runWithRotation<T>(
  context: 'chat' | 'extraction' | 'interaction',
  operation: (ai: GoogleGenAI) => Promise<T>
): Promise<T> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("No Gemini API Key is configured. Please configure GEMINI_API_KEY in your environment secrets.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  return await operation(ai);
}

// Models to try in priority order when experiencing 503 high demand, 404, or 429 rate limit
const RESILIENT_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest'
];

/**
 * Sanitizes and normalizes extracted medicine details so null/undefined never leaks into the UI.
 */
function sanitizeExtractedMedicine(
  raw: any,
  ocrText?: string,
  hints?: { potentialExpiry?: string; potentialDosage?: string; potentialQuantity?: number }
) {
  const sanitizeStr = (val: any, fallback: string = ''): string => {
    if (val === null || val === undefined) return fallback;
    const str = String(val).trim();
    if (str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return fallback;
    return str;
  };

  let name = sanitizeStr(raw?.name, '');
  if (!name || name.length < 2) {
    if (ocrText && ocrText.trim().length > 2) {
      const firstValidLine = ocrText
        .split('\n')
        .map(l => l.trim())
        .find(l => l.length > 2 && !/^(exp|mfg|batch|b\.no|mrp|rs|tax)/i.test(l));
      name = firstValidLine || 'Scanned Medicine';
    } else {
      name = 'Scanned Medicine';
    }
  }

  let dosage = sanitizeStr(raw?.dosage, '');
  if (!dosage || dosage.toLowerCase() === 'null' || dosage.toLowerCase() === 'undefined') {
    dosage = hints?.potentialDosage || 'N/A';
  }

  let expirationDate = sanitizeStr(raw?.expirationDate, '');
  if (!expirationDate || expirationDate.includes('undefined') || expirationDate.toLowerCase() === 'null') {
    if (hints?.potentialExpiry) {
      expirationDate = hints.potentialExpiry;
    } else {
      const defaultDate = new Date();
      defaultDate.setFullYear(defaultDate.getFullYear() + 1);
      expirationDate = `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, '0')}-01`;
    }
  }

  let usageInstructions = sanitizeStr(raw?.usageInstructions, '');
  if (usageInstructions.toLowerCase() === 'null' || usageInstructions.toLowerCase() === 'undefined') {
    usageInstructions = '';
  }

  const validForms = ["tablet", "capsule", "syrup", "ampule", "powder", "tape", "liquid", "other"];
  let form = sanitizeStr(raw?.form, 'tablet').toLowerCase();
  if (!validForms.includes(form)) {
    form = 'tablet';
  }

  let quantity = Number(raw?.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    quantity = hints?.potentialQuantity || 1;
  }

  return {
    name,
    dosage,
    expirationDate,
    usageInstructions,
    form,
    quantity
  };
}

/**
 * Executes a Gemini model call with automatic fallback across models if one is experiencing
 * 503 high demand, 429 rate limit, 404 not found, or temporary unavailability.
 */
async function generateContentWithModelFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    preferredModel?: string;
  }
) {
  const modelsToTry = params.preferredModel 
    ? [params.preferredModel, ...RESILIENT_MODELS.filter(m => m !== params.preferredModel)]
    : RESILIENT_MODELS;

  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const msg = err.message || String(err);
      const is503 = msg.includes('503') || msg.toLowerCase().includes('high demand') || msg.toLowerCase().includes('unavailable');
      const is429 = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource_exhausted');
      const is404 = msg.includes('404') || msg.toLowerCase().includes('not found');

      if (is503 || is429 || is404) {
        const reason = is503 ? '503 High Demand' : is429 ? '429 Rate Limit' : '404 Model Not Found';
        console.warn(`[GEMINI MODEL FALLBACK] Model "${model}" hit ${reason}. Switching to alternate model "${modelsToTry[i + 1] || 'none'}"...`);
        // Short pause before switching to relieve burst pressure
        await new Promise(r => setTimeout(r, 250));
        continue;
      }
      
      // If it's a fatal validation error (like 400 bad image payload), don't keep cycling models pointlessly
      if (msg.includes('400')) {
        throw err;
      }
    }
  }

  throw lastError;
}

// Error formatter
const getDetailedError = (error: any, context: 'chat' | 'extraction' | 'interaction') => {
  const msg = error.message || String(error);
  const msgLower = msg.toLowerCase();
  if (
    msgLower.includes('exceeded its monthly spending cap') || 
    msgLower.includes('spending cap') || 
    msgLower.includes('quota') || 
    msgLower.includes('billing') || 
    msgLower.includes('limit exceeded')
  ) {
    return "Your project has exceeded its monthly spending cap or quota in Google AI Studio.";
  }
  if (msg.includes('503') || msgLower.includes('high demand') || msgLower.includes('unavailable')) {
    return "Gemini models are experiencing high demand right now. We attempted automatic retries across multiple backup models. Please tap scan once again in a few moments.";
  }
  if (msg.includes('400')) {
    if (context === 'extraction') {
      return "Gemini Image Error (400). The AI had trouble processing this specific image. Please try a clearer, closer photo with better lighting.";
    }
    return `Gemini Request Error (400). The AI had trouble processing your request. Please check your inputs or try again.`;
  }
  if (msg.includes('403') || msgLower.includes('denied') || msgLower.includes('permission_denied')) {
    return "Your Google AI Studio Project has been restricted or denied access (403 PERMISSION_DENIED). Please verify that your active GEMINI_API_KEY is correct, enabled, and linked to a project in good standing with active billing/quota in Google AI Studio.";
  }
  if (msg.includes('404')) return "Gemini Model Not Found (404). Please ensure the requested model is valid.";
  if (msg.includes('429')) return "Gemini Quota Exceeded (429). The system automatically retried; please wait a moment and try again.";
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

// Actual Gemini API logic on Server with High-Fidelity Multimodal Vision & OCR Enhancement
export async function extractMedicineDataServer(
  base64Image?: string,
  ocrText?: string,
  hints?: { potentialExpiry?: string; potentialDosage?: string; potentialQuantity?: number }
) {
  try {
    return await runWithRotation('extraction', async (ai) => {
      // Build a rich clinical extraction prompt
      const contextHints = [];
      if (ocrText && ocrText.trim().length > 3) {
        contextHints.push(`Detected packaging text fragments:\n"""\n${ocrText.trim()}\n"""`);
      }
      if (hints?.potentialExpiry) {
        contextHints.push(`Detected candidate expiry: ${hints.potentialExpiry}`);
      }
      if (hints?.potentialDosage) {
        contextHints.push(`Detected candidate dosage/strength: ${hints.potentialDosage}`);
      }
      if (hints?.potentialQuantity) {
        contextHints.push(`Detected candidate quantity: ${hints.potentialQuantity}`);
      }

      const promptText = `You are a licensed clinical pharmacist and computer vision specialist specializing in pharmaceutical packaging recognition (blister packs, strips, bottles, boxes, ampules, syrups, ointments).

Carefully examine this medicine photo and packaging text to extract high-accuracy metadata.

${contextHints.join('\n\n')}

FIELD-BY-FIELD INSTRUCTIONS:
1. "name":
   - Find the prominent trade/brand name (e.g., "Augmentin 625 Duo", "Dolo 650", "Pan 40", "Azithral 500", "Calpol").
   - Include the generic formulation/active salt in parentheses if visible (e.g., "Augmentin 625 Duo (Amoxicillin and Potassium Clavulanate)").
   - Never output "null", "undefined", or gibberish.

2. "dosage":
   - Find the explicit strength of the primary active ingredient (e.g., "650mg", "500mg", "40mg", "5mg/5ml", "100mcg", "2% w/w", "10 IU").
   - If not found, use the closest dosage hint provided or standard clinical dose.

3. "expirationDate":
   - Scrutinize the packaging for stamps like "EXP", "EXPIRY", "EXP DATE", "VALID TILL", "BB", "BEST BEFORE", "USE BEFORE" (often stamped along the crimped foil edge, side flap, or bottom).
   - Convert month and year into ISO format YYYY-MM-01 (e.g., "08/2026" or "Aug 26" -> "2026-08-01").
   - Do NOT confuse manufacturing date (MFG / B.No) with expiry date (EXP).

4. "form":
   - Identify the exact formulation: "tablet", "capsule", "syrup", "ampule", "powder", "tape", "liquid", or "other".

5. "quantity":
   - Look for pack size (e.g., "10 Tablets", "15 Capsules", "Strip of 10", "100ml").
   - Default to 10 for standard blister strips or 1 for bottles/syrups if not specified.

6. "usageInstructions":
   - Extract clinical guidance if printed (e.g., "As directed by physician", "Take after food", "Store below 25°C protected from moisture").`;

      // Multimodal execution: Send both the image and the OCR text so Gemini Vision can see the label directly
      const contentsPayload: any[] = [];
      if (base64Image) {
        contentsPayload.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        });
      }
      contentsPayload.push({ text: promptText });

      console.log(`[GEMINI EXTRACT] Performing Multimodal Vision extraction (hasImage: ${!!base64Image}, ocrChars: ${ocrText?.length || 0})`);

      const response = await generateContentWithModelFallback(ai, {
        preferredModel: "gemini-2.5-flash",
        contents: contentsPayload,
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
      
      let cleanedJson = text.trim();
      if (cleanedJson.startsWith("```")) {
        cleanedJson = cleanedJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      }

      const rawResult = JSON.parse(cleanedJson);
      const result = sanitizeExtractedMedicine(rawResult, ocrText, hints);
      return { success: true, medicine: result, ocrAssisted: !!ocrText };
    });
  } catch (error: any) {
    console.error("Server extraction error:", error);
    
    // Server-level graceful fallback: if Gemini failed, build a usable medicine object from OCR hints
    if (hints && (hints.potentialExpiry || hints.potentialDosage || (ocrText && ocrText.length > 5))) {
      console.log("[SERVER EXTRACTION FALLBACK] Recovering from model error using OCR hints");
      const fallbackMedicine = sanitizeExtractedMedicine({}, ocrText, hints);
      return {
        success: true,
        medicine: fallbackMedicine,
        warningMessage: "High AI traffic right now. Details pre-filled from on-device label scanner. Please review and confirm.",
        ocrAssisted: true
      };
    }

    return { success: false, errorMessage: error.message || String(error) };
  }
}

export async function checkDrugInteractionsServer(medicines: { name: string; dosage: string }[]) {
  try {
    return await runWithRotation('interaction', async (ai) => {
      const prompt = `Act as a medical expert. Check for drug-drug interactions between these medications: ${medicines.map(m => `${m.name} (${m.dosage})`).join(', ')}. 
      Return JSON: { hasInteractions: boolean, interactions: [{ medications: string[], severity: "low"|"moderate"|"high", description: string, recommendation: string }], generalAdvice: string }`;
      
      const response = await generateContentWithModelFallback(ai, {
        preferredModel: "gemini-2.5-flash",
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

      const response = await generateContentWithModelFallback(ai, {
        preferredModel: "gemini-2.5-flash",
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
