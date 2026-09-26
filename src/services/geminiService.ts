import { MedicineForm, ChatMessage } from "../types";
import { GoogleGenAI } from "@google/genai";

export const isProviderKeyMissing = (provider: 'gemini' = 'gemini') => {
  return !getClientApiKey();
};

export interface ExtractedMedicine {
  name: string;
  dosage: string;
  expirationDate: string;
  usageInstructions?: string;
  schedule?: string;
  quantity?: number;
  form?: MedicineForm;
}

export interface ExtractionResult {
  success: boolean;
  errorMessage?: string;
  warningMessage?: string;
  medicine?: ExtractedMedicine;
}

export interface Interaction {
  medications: string[];
  severity: "low" | "moderate" | "high";
  description: string;
  recommendation: string;
}

export interface InteractionResult {
  hasInteractions: boolean;
  interactions: Interaction[];
  generalAdvice: string;
}

const SYSTEM_INSTRUCTION = `You are Dr. DawaLens, an incredibly friendly, exceptionally empathetic, and highly knowledgeable companion and family physician. Your role is to guide patients through their medication inventory with pristine care, a very warm tone, and deep understanding.

CRITICAL INSTRUCTIONS:
1. . GREETING:
   - If user ask questions then give answer remove greeeting.
   - If the user starts with a simple greeting (e.g., "Hi", "Hello", "How are you?"), reply briefly with a friendly, single-sentence greeting and ask how you can help.
   - For all other queries (i.e., medical questions, product questions), reply directly and immediately to the user's query. Do not add any extra conversational text.
   - Always start with a friendly greeting if it is the very first message.
2. TONE & LANGUAGE:
   - Be empathetic, polite, and respectful. Use emojis (💊, 🌿, 😊, 🙏) to make the conversation warm.
   - Use bold text (**) for key medicine names, headings, and important warnings.
   - **HINGLISH SUPPORT**: If a user selects 'Hinglish' or types in a mix of Hindi and English, you MUST respond in Hinglish. Hinglish is Hindi language written in English script (Roman script), mixed with English medical/technical terms (e.g., "Aapko ye **Paracetamol** din mein do baar khani hai khana khane ke baad. Agar fever kam nahi hota toh doctor se consult karein.").
   - For other languages, follow the requested translation strictly but maintain the professional pharmacist persona.
3. INVENTORY SCAN: You have direct access to the user's "Patient Profile & Storage Context". When the user asks about an ailment (e.g., "I have a headache") or a category (e.g., "What painkillers do I have?"), you MUST perform a meticulous scan of their 'User's Stored Medicines'.
4. BE EXHAUSTIVE: If a user asks what they have, list ALL relevant medicines found in their inventory. Never say "I don't see any" unless you have double-checked the exact names provided in the context.
5. ADVICE STRUCTURE: 
   - First, tell them exactly what they already have that can help.
   - Second, provide professional advice on how to use it safely.
   - Third, only if they have nothing relevant, suggest standard over-the-counter options.
6. TONE: Exceptionally friendly, conversational, comforting, and supportive. Greet the user with warmth, show deep concern for their health, use highly encouraging words, and keep the dialogue light and engaging like a trusted, caring family doctor. Use Markdown for structured lists and bolding key terms.
7. NO REPETITIVE DISCLAIMERS: A mandatory safety disclaimer is shown in the UI daily. Do not add "I am an AI..." or "Consult a doctor..." to EVERY message. Only include it if giving high-risk advice.
8. CONTEXT AWARENESS: Always prioritize the medicines the user already owns. Treat the provided inventory as the absolute source of truth for their 'vault'.`;

function getClientApiKey(): string {
  // Check localStorage first
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem('GEMINI_API_KEY') : null;
  if (stored) return stored;

  // Check env variable defined by Vite config
  const envKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : '';
  if (envKey) return envKey;

  // Check import.meta.env
  const viteKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (viteKey) return viteKey;

  return '';
}

export async function chatWithGeminiClient(messages: ChatMessage[]): Promise<string> {
  const apiKey = getClientApiKey();
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in your environment or local storage.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      ...history,
      { role: 'user', parts: [{ text: messages[messages.length - 1].content }] }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION
    }
  });

  return response.text || "I'm sorry, I couldn't generate a response.";
}

export async function extractMedicineDataClient(base64Image: string): Promise<ExtractionResult> {
  const apiKey = getClientApiKey();
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in your environment or local storage.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
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
        type: 'OBJECT' as any,
        properties: {
          name: { type: 'STRING' as any },
          dosage: { type: 'STRING' as any },
          expirationDate: { type: 'STRING' as any },
          usageInstructions: { type: 'STRING' as any },
          form: { type: 'STRING' as any, enum: ["tablet", "capsule", "syrup", "ampule", "powder", "tape", "liquid", "other"] },
          quantity: { type: 'NUMBER' as any }
        },
        required: ["name", "dosage", "expirationDate", "form"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("AI returned empty response");
  
  const result = JSON.parse(text);
  return { success: true, medicine: result };
}

export async function checkDrugInteractionsClient(medicines: { name: string; dosage: string }[]): Promise<InteractionResult> {
  const apiKey = getClientApiKey();
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in your environment or local storage.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Act as a medical expert. Check for drug-drug interactions between these medications: ${medicines.map(m => `${m.name} (${m.dosage})`).join(', ')}. 
  Return JSON: { hasInteractions: boolean, interactions: [{ medications: string[], severity: "low"|"moderate"|"high", description: string, recommendation: string }], generalAdvice: string }`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: 'OBJECT' as any,
        properties: {
          hasInteractions: { type: 'BOOLEAN' as any },
          interactions: {
            type: 'ARRAY' as any,
            items: {
              type: 'OBJECT' as any,
              properties: {
                medications: { type: 'ARRAY' as any, items: { type: 'STRING' as any } },
                severity: { type: 'STRING' as any, enum: ["low", "moderate", "high"] },
                description: { type: 'STRING' as any },
                recommendation: { type: 'STRING' as any }
              },
              required: ["medications", "severity", "description", "recommendation"]
            }
          },
          generalAdvice: { type: 'STRING' as any }
        },
        required: ["hasInteractions", "interactions", "generalAdvice"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("AI returned empty response");
  return JSON.parse(text);
}

export async function extractMedicineData(base64Image: string): Promise<ExtractionResult> {
  try {
    const response = await fetch('/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      if (errText.trim().startsWith('<') || response.status === 404) {
        console.warn("Server API returned HTML or 404. Falling back to client-side extraction...");
        return await extractMedicineDataClient(base64Image);
      }
      
      let errData;
      try {
        errData = JSON.parse(errText);
      } catch {
        throw new Error("Failed to parse extraction error from server.");
      }
      throw new Error(errData.errorMessage || errData.error || "Failed to extract medicine data from image.");
    }
    
    return await response.json();
  } catch (error: any) {
    console.warn("Extraction server error, trying client fallback:", error);
    if (!getClientApiKey()) {
      return { success: false, errorMessage: error.message || String(error) };
    }
    try {
      return await extractMedicineDataClient(base64Image);
    } catch (fallbackError: any) {
      console.error("Client fallback extraction error:", fallbackError);
      return { success: false, errorMessage: fallbackError.message || String(fallbackError) };
    }
  }
}

export async function checkDrugInteractions(medicines: { name: string; dosage: string }[]): Promise<InteractionResult | null> {
  try {
    const response = await fetch('/api/ai/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicines })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      if (errText.trim().startsWith('<') || response.status === 404) {
        console.warn("Server API returned HTML or 404. Falling back to client-side interaction check...");
        return await checkDrugInteractionsClient(medicines);
      }
      
      let errData;
      try {
        errData = JSON.parse(errText);
      } catch {
        throw new Error("Failed to parse interaction error from server.");
      }
      throw new Error(errData.error || "Failed to check drug interactions.");
    }
    
    return await response.json();
  } catch (error: any) {
    console.warn('Interaction server check failed, trying client fallback:', error);
    if (!getClientApiKey()) {
      throw error;
    }
    try {
      return await checkDrugInteractionsClient(medicines);
    } catch (fallbackError) {
      console.error('Client fallback interaction check error:', fallbackError);
      return null;
    }
  }
}

export async function chatWithAI(messages: ChatMessage[], provider: 'gemini' = 'gemini', userId?: string, medicines?: any[]): Promise<string> {
  return chatWithGemini(messages, userId, medicines);
}

export async function chatWithGemini(messages: ChatMessage[], userId?: string, medicines?: any[]): Promise<string> {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, userId, medicines })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      if (errText.trim().startsWith('<') || response.status === 404) {
        console.warn("Server API returned HTML or 404. Falling back to client-side chat...");
        return await chatWithGeminiClient(messages);
      }
      
      let errData;
      try {
        errData = JSON.parse(errText);
      } catch {
        throw new Error("Failed to parse chat error from server.");
      }
      throw new Error(errData.error || "Failed to communicate with AI server.");
    }
    
    const data = await response.json();
    return data.responseText;
  } catch (error: any) {
    console.warn('Gemini Server Chat failed, trying client-side fallback:', error);
    if (!getClientApiKey()) {
      throw error;
    }
    try {
      return await chatWithGeminiClient(messages);
    } catch (fallbackError: any) {
      console.error('Client-side fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
}

export async function getChatCountToday(userId: string): Promise<number> {
  try {
    const response = await fetch(`/api/ai/chat-count?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      const errText = await response.text();
      if (errText.trim().startsWith('<') || response.status === 404) {
        return 0; // If endpoint is missing/HTML (e.g. Vercel), don't show limit count
      }
      throw new Error("Failed to fetch chat count");
    }
    const data = await response.json();
    return data.count;
  } catch (error) {
    console.error("Error fetching chat count:", error);
    return 0;
  }
}
