import { MedicineForm, ChatMessage } from "../types";
import { GoogleGenAI } from "@google/genai";
import { performOnDeviceOcr, OcrPreExtractionHints } from "./ocrService";
import { runImageCnnClassifier, CnnVisualFeatures } from "./imageCnnService";
import { getApiUrl, getDirectRenderUrl } from "../utils/apiConfig";
import { getAuthHeader } from "../firebase";
import { 
  generateOfflineSlmConsultation, 
  extractMedicineOfflineSlm,
  isNormalChat,
  PHARMA_KNOWLEDGE_BASE
} from "./slmPharmacistModel";

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
  category?: string;
  categories?: string[];
  tags?: string[];
}

export interface ExtractionResult {
  success: boolean;
  errorMessage?: string;
  warningMessage?: string;
  medicine?: ExtractedMedicine;
  ocrAssisted?: boolean;
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

const SYSTEM_INSTRUCTION = `You are Dr. DawaSnap, an incredibly friendly, exceptionally empathetic, and highly knowledgeable companion and family physician. Your role is to guide patients through their medication inventory with pristine care, a very warm tone, and deep understanding.

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

// Resilient model fallback list for client calls per Gemini API guidelines
const RESILIENT_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

async function generateContentWithModelFallbackClient(
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

      if (is503 || is429) {
        console.warn(`[CLIENT GEMINI MODEL FALLBACK] Model "${model}" hit ${is503 ? '503 High Demand' : '429 Rate Limit'}. Switching to alternate model "${modelsToTry[i + 1] || 'none'}"...`);
        await new Promise(r => setTimeout(r, 350));
        continue;
      }
      
      if (msg.includes('400')) {
        throw err;
      }
    }
  }

  throw lastError;
}

export async function chatWithGeminiClient(messages: ChatMessage[], medicines?: any[]): Promise<string> {
  const apiKey = getClientApiKey();
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in your environment or local storage.");
  }

  let userMedicinesContext = "";
  if (medicines && Array.isArray(medicines) && medicines.length > 0) {
    const activeList = medicines.filter(m => !m.isDeleted);
    const medsStr = activeList.map(m => `- ${m.name} (${m.dosage || 'Dosage: N/A'}, Form: ${m.form || 'tablet'}, Expiry: ${m.expirationDate || 'N/A'}, Qty: ${m.quantity || 1})`).join('\n');
    userMedicinesContext = `\n\nCURRENT USER MEDICINES IN VAULT (${activeList.length} unique medicines):\n${medsStr}\n\nAlways check and refer to this list to answer about the user's active medicines. If they ask about total medicines, count, what they have, or ask for a remedy, meticulously check this list first.`;
  } else {
    userMedicinesContext = `\n\nCURRENT USER MEDICINES IN VAULT: 0 active medicines. The user's vault is currently empty.`;
  }

  const ai = new GoogleGenAI({ apiKey });
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const response = await generateContentWithModelFallbackClient(ai, {
    preferredModel: "gemini-3.8-flash",
    contents: [
      ...history,
      { role: 'user', parts: [{ text: messages[messages.length - 1].content }] }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + userMedicinesContext
    }
  });

  return response.text || "I'm sorry, I couldn't generate a response.";
}

export async function extractMedicineDataClient(
  base64Image: string,
  ocrText?: string,
  hints?: OcrPreExtractionHints
): Promise<ExtractionResult> {
  const apiKey = getClientApiKey();
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in your environment or local storage.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const hasMeaningfulOcr = ocrText && ocrText.trim().length > 10;

  // 1. Text-Only Mode (Low token consumption)
  if (hasMeaningfulOcr) {
    const textPrompt = `You are an expert clinical pharmacist and data validator.
Analyze this raw OCR text extracted directly from a medicine packaging/strip:
"""
${ocrText.trim()}
"""
${hints?.potentialExpiry ? `Local candidate expiry date: ${hints.potentialExpiry}` : ''}
${hints?.potentialDosage ? `Local candidate dosage/strength: ${hints.potentialDosage}` : ''}
${hints?.potentialQuantity ? `Local candidate strip/pack quantity: ${hints.potentialQuantity}` : ''}

CRITICAL RULES:
1. Fix any OCR typographical errors (e.g. Paracetam0l -> Paracetamol, Am0xicillin -> Amoxicillin).
2. Extract exact medicine details:
   - Name: Medicine brand name & composition.
   - Dosage: Strength (e.g. 500mg, 625mg, 10ml).
   - Expiration Date: Format YYYY-MM-01 (use the 1st day of the month).
   - Usage Instructions: Daily frequency/instructions/storage warnings.
   - Form: tablet, capsule, syrup, ampule, powder, tape, liquid, or other.
   - Quantity: Number of units in the strip or pack.
   - Categories: Array of clinical categories (e.g. ["Fever", "Pain Relief"] for Zerodol-P, Dolo, Combiflam).
   - Category: Comma-separated string of categories.`;

    const response = await generateContentWithModelFallbackClient(ai, {
      preferredModel: "gemini-3.8-flash",
      contents: textPrompt,
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
            quantity: { type: 'NUMBER' as any },
            categories: { type: 'ARRAY' as any, items: { type: 'STRING' as any } },
            category: { type: 'STRING' as any }
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

    const result = JSON.parse(cleanedJson);

    if ((!result.expirationDate || result.expirationDate.includes('undefined')) && hints?.potentialExpiry) {
      result.expirationDate = hints.potentialExpiry;
    }
    if ((!result.dosage || result.dosage === 'N/A') && hints?.potentialDosage) {
      result.dosage = hints.potentialDosage;
    }
    if ((!result.quantity || result.quantity === 0) && hints?.potentialQuantity) {
      result.quantity = hints.potentialQuantity;
    }

    return { success: true, medicine: result, ocrAssisted: true };
  }

  // 2. Multimodal Vision Fallback
  const response = await generateContentWithModelFallbackClient(ai, {
    preferredModel: "gemini-3.8-flash",
    contents: [
      { inlineData: { mimeType: "image/jpeg", data: base64Image } },
      { 
        text: `You are a medical data extraction expert. 
        Perform exhaustive OCR to extract all visible text from the packaging.
        Then, identify:
        - Name: Medicine name and composition.
        - Dosage: Strength.
        - Expiration Date: Format YYYY-MM-01 (use the 1st day of the month, e.g. 2026-05-01 if May 2026 is given).
        - Usage Instructions: Daily frequency/instructions.
        - Form: tablet, capsule, syrup, ampule, powder, liquid, or other.
        - Quantity: Number of units in the strip or pack.
        - Categories: Array of clinical categories (e.g. ["Fever", "Pain Relief"] for Zerodol-P, Dolo, Combiflam, Paracetamol + Aceclofenac).
        - Category: Comma-separated string of categories.` 
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
          quantity: { type: 'NUMBER' as any },
          categories: { type: 'ARRAY' as any, items: { type: 'STRING' as any } },
          category: { type: 'STRING' as any }
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

  const result = JSON.parse(cleanedJson);
  return { success: true, medicine: result, ocrAssisted: false };
}

export async function checkDrugInteractionsClient(medicines: { name: string; dosage: string }[]): Promise<InteractionResult> {
  const apiKey = getClientApiKey();
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in your environment or local storage.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Act as a medical expert. Check for drug-drug interactions between these medications: ${medicines.map(m => `${m.name} (${m.dosage})`).join(', ')}. 
  Return JSON: { hasInteractions: boolean, interactions: [{ medications: string[], severity: "low"|"moderate"|"high", description: string, recommendation: string }], generalAdvice: string }`;
  
  const response = await generateContentWithModelFallbackClient(ai, {
    preferredModel: "gemini-3.8-flash",
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
  let ocrResult: OcrPreExtractionHints | null = null;
  let cnnFeatures: CnnVisualFeatures | null = null;

  try {
    // 1. Perform On-Device Image CNN Visual Classification
    cnnFeatures = await runImageCnnClassifier(base64Image);
  } catch (cnnErr) {
    console.warn("On-device Image CNN classifier warning:", cnnErr);
  }

  try {
    // 2. Perform On-Device OCR directly in browser / native bridge
    ocrResult = await performOnDeviceOcr(base64Image);
  } catch (ocrErr) {
    console.warn("Client OCR step caught an error, proceeding with image fallback:", ocrErr);
  }

  const ocrText = ocrResult?.cleanedText || ocrResult?.rawText || '';

  // Mode A: Online Gemini API Extraction (with CNN visual features & OCR hints)
  const extractPayload = JSON.stringify({ 
    base64Image,
    ocrText,
    cnnFeatures: cnnFeatures ? {
      form: cnnFeatures.form,
      packagingType: cnnFeatures.packagingType,
      estimatedUnitCount: cnnFeatures.estimatedUnitCount,
      hasBlisterGrid: cnnFeatures.hasBlisterGrid,
      blisterCellCount: cnnFeatures.blisterCellCount
    } : undefined,
    hints: ocrResult ? {
      potentialExpiry: ocrResult.potentialExpiry,
      potentialDosage: ocrResult.potentialDosage,
      potentialQuantity: ocrResult.potentialQuantity || cnnFeatures?.estimatedUnitCount
    } : undefined
  });

  try {
    const authHeaders = await getAuthHeader();
    let response: Response | null = null;
    try {
      response = await fetch(getApiUrl('/api/ai/extract'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: extractPayload
      });
    } catch (e) {
      console.warn("Primary extract fetch failed:", e);
    }
    
    // Direct Render URL fallback if Vercel proxy rewrite is not reachable or initial fetch threw
    if (!response || !response.ok || response.status === 404) {
      try {
        response = await fetch(getDirectRenderUrl('/api/ai/extract'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: extractPayload
        });
      } catch (directErr) {
        console.warn("Direct Render backend extract attempt failed:", directErr);
      }
    }

    if (response && response.ok) {
      const data = await response.json();
      if (data.success && data.medicine) {
        return data;
      }
      if (data.errorMessage) {
        throw new Error(data.errorMessage);
      }
    }
  } catch (error: any) {
    console.warn("Server extraction unavailable, falling back to on-device CNN + SLM model:", error);
  }

  // Mode B: Client-side Gemini if API key is present
  if (getClientApiKey()) {
    try {
      const clientResult = await extractMedicineDataClient(base64Image, ocrText, {
        ...(ocrResult || { cleanedText: '', rawText: '', source: 'fallback' }),
        potentialQuantity: ocrResult?.potentialQuantity || cnnFeatures?.estimatedUnitCount
      });
      if (clientResult.success) {
        return clientResult;
      }
    } catch (clientErr) {
      console.warn("Client Gemini extraction failed, proceeding to On-Device SLM:", clientErr);
    }
  }

  // Mode C: On-Device Image CNN + Clinical SLM Model (100% Offline execution)
  try {
    const offlineMedicine = extractMedicineOfflineSlm(
      ocrText,
      cnnFeatures || undefined,
      ocrResult ? {
        potentialExpiry: ocrResult.potentialExpiry,
        potentialDosage: ocrResult.potentialDosage,
        potentialQuantity: ocrResult.potentialQuantity || cnnFeatures?.estimatedUnitCount
      } : undefined
    );

    return {
      success: true,
      medicine: offlineMedicine as any,
      warningMessage: "Details extracted via On-Device Image CNN & Clinical SLM model. Please verify below.",
      ocrAssisted: true
    };
  } catch (offlineErr: any) {
    console.error("On-device SLM extraction error:", offlineErr);
    return {
      success: false,
      errorMessage: "Could not read the medicine packaging clearly. Please hold steady in good lighting and scan again."
    };
  }
}

export async function checkDrugInteractions(medicines: { name: string; dosage: string }[]): Promise<InteractionResult | null> {
  const payload = JSON.stringify({ medicines });
  try {
    const authHeaders = await getAuthHeader();
    let response: Response | null = null;
    try {
      response = await fetch(getApiUrl('/api/ai/interactions'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: payload
      });
    } catch (e) {
      console.warn("Primary interactions fetch failed:", e);
    }

    if (!response || !response.ok || response.status === 404) {
      try {
        response = await fetch(getDirectRenderUrl('/api/ai/interactions'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: payload
        });
      } catch (e) {}
    }
    
    if (!response || !response.ok) {
      const errText = response ? await response.text() : '';
      if (!response || errText.trim().startsWith('<') || response.status === 404) {
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

export interface AIChatResponse {
  content: string;
  provider: 'gemini' | 'slm';
}

export interface SpecialistInfo {
  name: 'Dr. Jack' | 'Dr. Ross';
  displayName: string;
  headerDisplay: string;
  taskTitle: string;
  provider: 'gemini' | 'slm';
  badgeColor: 'emerald' | 'indigo' | 'amber' | 'teal' | 'rose' | 'blue';
}

/**
 * Dynamically resolves the active specialist (Dr. Ross vs Dr. Jack) and task title
 * based on user query intent, pharmacological task domain, and AI provider.
 * - Dr. Ross: Inventory counts ("total medicine i have"), vault listings, stock, expiry checks, schedule, greetings.
 * - Dr. Jack: Clinical advice, drug interactions, side effects, pharmacological queries, medical explanations.
 */
export function getSpecialistForTask(queryText: string, provider?: 'gemini' | 'slm'): SpecialistInfo {
  const lower = (queryText || '').toLowerCase().trim();

  // 1. Inventory & Stock counts
  if (
    /\btotal\s+(?:all\s+)?(?:of\s+)?(?:the\s+)?(?:my\s+)?(?:medicines?|meds?|drugs?|tablets?|pills?|items?|inventory|vault|prescription|stock)/i.test(lower) ||
    /(?:my\s+)?(?:medicines?|meds?|drugs?|tablets?|pills?|items?|vault|inventory)\s+(?:count|number|quantity|total)/i.test(lower) ||
    /(?:count|number|quantity)\s+(?:of\s+)?(?:all\s+)?(?:the\s+)?(?:my\s+)?(?:medicines?|meds?|drugs?|tablets?|pills?|items?|vault|inventory)/i.test(lower) ||
    /how\s+many\s+(?:medicines?|meds?|pills?|tablets?|drugs?|do\s+i\s+have|in\s+my|total|stored|have)/i.test(lower) ||
    /how\s+much\s+(?:medicine|meds?|stock|quantity)/i.test(lower) ||
    /(?:list|show|what)\s+(?:all\s+)?(?:my\s+)?(?:medicines?|meds?|vault|inventory)/i.test(lower) ||
    /(?:kitni|kitne|kitna)\s+(?:dawai|dawa|medicine)/i.test(lower) ||
    /(?:total|kul)\s+(?:dawai|dawa|medicine|kitni)/i.test(lower) ||
    /(?:mere\s+paas\s+)?kitni\s+(?:dawai|dawa|medicine)/i.test(lower) ||
    /count\s+(?:my\s+)?(?:medicines?|meds?)/i.test(lower) ||
    /(?:how\s+many|quantity\s+of|stock\s+of)\s+[a-z]+/i.test(lower)
  ) {
    return {
      name: 'Dr. Ross',
      taskTitle: 'Medicine Inventory',
      displayName: 'Dr. Ross • Inventory',
      headerDisplay: 'DR. ROSS • INVENTORY',
      provider: 'slm',
      badgeColor: 'emerald'
    };
  }

  // 2. Expiry & Shelf Life
  if (
    /(?:expir|expired|expiry|shelf\s*life|bad\s*date|out\s*of\s*date|validity)/i.test(lower) ||
    /(?:which\s+medicines?\s+(?:are\s+)?expir)/i.test(lower)
  ) {
    return {
      name: 'Dr. Ross',
      taskTitle: 'Expiry Monitor',
      displayName: 'Dr. Ross • Expiry Monitor',
      headerDisplay: 'DR. ROSS • EXPIRY MONITOR',
      provider: 'slm',
      badgeColor: 'amber'
    };
  }

  // 3. Intake Schedule, Timings & Daily Routine
  if (
    /(?:daily\s+schedule|when\s+(?:should|to)\s+i\s+take|timing|routine|morning|afternoon|night|before\s+food|after\s+food|empty\s+stomach|reminder)/i.test(lower)
  ) {
    return {
      name: 'Dr. Ross',
      taskTitle: 'Intake Schedule',
      displayName: 'Dr. Ross • Intake Schedule',
      headerDisplay: 'DR. ROSS • INTAKE SCHEDULE',
      provider: 'slm',
      badgeColor: 'teal'
    };
  }

  // 4. Low Stock & Refills
  if (
    /(?:low\s+stock|refill|shortage|running\s+out|restock)/i.test(lower)
  ) {
    return {
      name: 'Dr. Ross',
      taskTitle: 'Stock Alert',
      displayName: 'Dr. Ross • Stock Alert',
      headerDisplay: 'DR. ROSS • STOCK ALERT',
      provider: 'slm',
      badgeColor: 'emerald'
    };
  }

  // 5. Drug Interactions & Contraindications
  if (
    /(?:interact|contraindicat|mix|together|combine|combination|clash|safe\s+with|along\s+with|conflict)/i.test(lower)
  ) {
    return {
      name: 'Dr. Jack',
      taskTitle: 'Drug Interactions',
      displayName: 'Dr. Jack • Drug Interactions',
      headerDisplay: 'DR. JACK • DRUG INTERACTIONS',
      provider: 'gemini',
      badgeColor: 'indigo'
    };
  }

  // 6. Side Effects, Adverse Reactions & Safety Warnings
  if (
    /(?:side\s*effects?|adverse|reaction|harmful|danger|risk|poison|toxicity|toxic|allergy|allergic)/i.test(lower)
  ) {
    return {
      name: 'Dr. Jack',
      taskTitle: 'Safety & Side Effects',
      displayName: 'Dr. Jack • Side Effects',
      headerDisplay: 'DR. JACK • SIDE EFFECTS',
      provider: 'gemini',
      badgeColor: 'rose'
    };
  }

  // 7. Dosage, Administration & Overdose
  if (
    /(?:dosage|how\s+much\s+(?:mg|ml|dose|tablets?)|maximum\s+dose|overdose|frequency|times\s+a\s+day)/i.test(lower)
  ) {
    return {
      name: 'Dr. Jack',
      taskTitle: 'Dosage Guidelines',
      displayName: 'Dr. Jack • Dosage Specialist',
      headerDisplay: 'DR. JACK • DOSAGE SPECIALIST',
      provider: 'gemini',
      badgeColor: 'blue'
    };
  }

  // 8. General Clinical Pharmacology & Medical Inquiries
  if (
    /(?:what\s+is|used\s+for|purpose|treatment|cure|prescribe|symptom|disease|condition|fever|pain|cough|cold|infection|antibiotic|paracetamol|ibuprofen|aspirin|amoxicillin|metformin|atorvastatin)/i.test(lower)
  ) {
    return {
      name: 'Dr. Jack',
      taskTitle: 'Clinical Pharmacology',
      displayName: 'Dr. Jack • Clinical Specialist',
      headerDisplay: 'DR. JACK • CLINICAL SPECIALIST',
      provider: 'gemini',
      badgeColor: 'indigo'
    };
  }

  // 9. Greetings & Polite Pleasantries
  if (/^(hi|hello|hey|namaste|good\s*(morning|evening|afternoon)|salam|greetings|how\s*are\s*you|who\s*are\s*you|thank\s*you|thanks|ok|okay)\b/i.test(lower) && lower.length < 40) {
    return {
      name: 'Dr. Ross',
      taskTitle: 'AI Consultation',
      displayName: 'Dr. Ross • On-Device SLM',
      headerDisplay: 'DR. ROSS • ON-DEVICE SLM',
      provider: 'slm',
      badgeColor: 'emerald'
    };
  }

  // Default fallback based on provider or query length
  if (provider === 'gemini') {
    return {
      name: 'Dr. Jack',
      taskTitle: 'Clinical AI',
      displayName: 'Dr. Jack • Clinical Specialist',
      headerDisplay: 'DR. JACK • CLINICAL SPECIALIST',
      provider: 'gemini',
      badgeColor: 'indigo'
    };
  }

  return {
    name: 'Dr. Ross',
    taskTitle: 'Vault & Stock',
    displayName: 'Dr. Ross • Vault & Stock',
    headerDisplay: 'DR. ROSS • VAULT & STOCK',
    provider: 'slm',
    badgeColor: 'emerald'
  };
}

/**
 * Determines whether a task should be handled by Dr. Ross (On-Device SLM)
 * vs Dr. Jack (Cloud Gemini AI).
 */
export function isSlmSpecializedTask(queryText: string): boolean {
  const spec = getSpecialistForTask(queryText);
  return spec.provider === 'slm';
}

export async function chatWithAI(
  messages: ChatMessage[], 
  provider: 'gemini' | 'slm' = 'gemini', 
  userId?: string, 
  medicines?: any[]
): Promise<AIChatResponse> {
  const lastUserMsg = messages[messages.length - 1]?.content || '';

  // 1. Dynamic Routing by Task:
  // If user selected SLM or the task is an on-device specialty (inventory counts, expiry, schedule, greetings):
  if (provider === 'slm' || isSlmSpecializedTask(lastUserMsg)) {
    console.log('[SLM ROUTER ACTIVE] Task routed to On-Device SLM (Dr. Ross)...');
    const slmResponse = generateOfflineSlmConsultation(lastUserMsg, medicines || [], messages);
    return { content: slmResponse, provider: 'slm' };
  }

  // 2. Complex Clinical, Pharmacological, or General Medical Questions:
  // Routed to Cloud Gemini AI (Dr. Jack) with full medicines context
  console.log('[GEMINI ROUTER ACTIVE] Task routed to Gemini Cloud AI (Dr. Jack)...');
  try {
    const geminiResponse = await chatWithGemini(messages, userId, medicines);
    if (geminiResponse && geminiResponse.trim()) {
      return { content: geminiResponse, provider: 'gemini' };
    }
  } catch (geminiErr) {
    console.warn('Gemini chat attempt failed, falling back to On-Device SLM (Dr. Ross):', geminiErr);
  }

  // 3. Fallback: On-Device SLM (Dr. Ross)
  const slmFallback = generateOfflineSlmConsultation(lastUserMsg, medicines || [], messages);
  return { content: slmFallback, provider: 'slm' };
}

export async function chatWithGemini(messages: ChatMessage[], userId?: string, medicines?: any[]): Promise<string> {
  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const chatPayload = JSON.stringify({ messages, medicines });

  try {
    const authHeaders = await getAuthHeader();
    let response: Response | null = null;
    try {
      response = await fetch(getApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: chatPayload
      });
    } catch (e) {
      console.warn("Primary chat fetch failed:", e);
    }

    // Direct Render URL fallback if Vercel proxy rewrite is unreachable or 404
    if (!response || !response.ok || response.status === 404) {
      try {
        const directResp = await fetch(getDirectRenderUrl('/api/ai/chat'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: chatPayload
        });
        if (directResp.ok) {
          response = directResp;
        }
      } catch (directErr) {
        console.warn("Direct Render backend chat attempt failed:", directErr);
      }
    }
    
    if (!response || !response.ok) {
      const errText = response ? await response.text() : '';
      if (!response || errText.trim().startsWith('<') || response.status === 404) {
        console.warn("Server API returned HTML or 404. Falling back to client-side chat...");
        return await chatWithGeminiClient(messages, medicines);
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
    console.warn('Gemini Server Chat failed, trying client-side Gemini fallback:', error);
    
    if (getClientApiKey()) {
      try {
        return await chatWithGeminiClient(messages, medicines);
      } catch (fallbackError: any) {
        console.warn('Client-side Gemini also unavailable, switching to On-Device Clinical SLM Model:', fallbackError);
      }
    }

    // 100% Offline Small Language Model (SLM) AI Pharmacist Engine
    console.log('[SLM PHARMACIST ACTIVE] Generating offline clinical consultation via on-device SLM...');
    return generateOfflineSlmConsultation(lastUserMsg, medicines || [], messages);
  }
}

export async function getChatCountToday(userId: string): Promise<number> {
  // Unlimited chat capacity as requested
  return 0;
}

export interface CategorizedMedicineItem {
  id: string;
  category: string;
  categories?: string[];
  form?: MedicineForm;
  tags?: string[];
}

export function classifyMedicineLocally(
  m: { id?: string; name: string; dosage?: string; usageInstructions?: string; form?: string }
): { id: string; category: string; categories?: string[]; form: MedicineForm } {
  const rawName = (m.name || '').trim().toLowerCase();
  const rawUsage = (m.usageInstructions || '').trim().toLowerCase();
  const rawDosage = (m.dosage || '').trim().toLowerCase();
  const fullText = `${rawName} ${rawUsage} ${rawDosage}`.trim();

  let category = '';
  let categories: string[] = [];
  let form: MedicineForm | undefined = undefined;

  // 1. Direct check for dual-action combinations (e.g. Zerodol-P, Dolo, Combiflam, Paracetamol + Aceclofenac)
  if (
    fullText.includes('zerodol p') || fullText.includes('zerodol-p') || fullText.includes('combiflam') ||
    fullText.includes('dolo') || fullText.includes('crocin') || fullText.includes('paracetamol') ||
    fullText.includes('calpol') || fullText.includes('aceclofenac') || fullText.includes('ibuprofen')
  ) {
    categories.push('Fever');
    categories.push('Pain Relief');
    category = 'Fever, Pain Relief';
  }

  // 2. Direct lookup in PHARMA_KNOWLEDGE_BASE (150+ drugs & brand names)
  if (!category && Array.isArray(PHARMA_KNOWLEDGE_BASE)) {
    for (const item of PHARMA_KNOWLEDGE_BASE) {
      const itemName = (item.name || '').toLowerCase();
      const generic = (item.genericName || '').toLowerCase();
      const matchesSynonym = Array.isArray(item.synonyms) && item.synonyms.some(s => {
        const sLower = s.toLowerCase();
        return sLower === rawName || rawName.includes(sLower) || (sLower.length >= 4 && fullText.includes(sLower));
      });

      if ((itemName && (rawName.includes(itemName) || fullText.includes(itemName))) ||
          (generic && (rawName.includes(generic) || fullText.includes(generic))) ||
          matchesSynonym) {
        category = item.category;
        categories = [category];
        if (item.defaultForm) form = item.defaultForm;
        break;
      }
    }
  }

  // 3. Comprehensive clinical therapeutic classification regexes
  if (!category) {
    if (/card|pressur|bp\b|amlod|losart|telmis|atorv|statin|aspirin|clopid|hyperten|heart|propranolol|atenolol|metoprolol|diltiazem|nitroglycerin/i.test(fullText)) {
      category = 'Heart';
    } else if (/paracet|dolo|ibupro|combiflam|tramad|diclo|aceclo|aspirin|pain|fever|headache|analgesic|nimesulide|ketorolac|mefenamic|meftal|crocin|calpol/i.test(fullText)) {
      category = 'Pain Relief';
    } else if (/vit|zinc|calcium|multivit|b12|d3|iron|folic|supple|omega|neurobion|becosules|folvite|limcee|shelcal|supradyn/i.test(fullText)) {
      category = 'Vitamins';
    } else if (/cillin|amox|clav|azith|cefix|cipro|levo|oflox|antibiotic|infect|fungal|doxycycline|metronidazole|ceftriaxone|ampicillin|bactrim|augmentin/i.test(fullText)) {
      category = 'Antibiotics';
    } else if (/metformin|glim|insulin|sugar|diabet|januvia|vildag|glipizide|dapagliflozin|empagliflozin|glycomet|teneligliptin/i.test(fullText)) {
      category = 'Diabetes';
    } else if (/panto|omepra|rabep|esom|antacid|gel|digene|gas\b|reflux|vomit|domperi|ibs|digest|ondansetron|gaviscon|ranitidine|famotidine|cremaffin|duphalac/i.test(fullText)) {
      category = 'Digestive';
    } else if (/cetir|levocet|allegra|fexo|allergy|cold\b|montel|sneez|phenylephrine|chlorpheniramine|sinus|histamine/i.test(fullText)) {
      category = 'Allergy';
    } else if (/inhaler|salbut|budesonide|asthma|respirat|breath|cough|asthalin|aerocort|foracort|ambroxol|dextromethorphan|terbutaline/i.test(fullText)) {
      category = 'Respiratory';
    } else if (/depress|anxiety|sertraline|escitalopram|clonazepam|alprazolam|diazepam|sleep|insomnia|mood|neuro/i.test(fullText)) {
      category = 'Mental Health';
    } else if (/derm|cream|ointment|lotion|skin|eczema|acne|clobetasol|betamethasone|clotrimazole|permethrin|antifungal|betadine/i.test(fullText)) {
      category = 'Skin Care';
    } else if (/eye|ear|drop|ophthalmic|otic|moxifloxacin|timolol|tears|carboxymethylcellulose/i.test(fullText)) {
      category = 'Eye & Ear';
    } else {
      category = 'General Care';
    }
    if (categories.length === 0) categories = [category];
  }

  // 4. Allot/verify dosage form
  if (!form) {
    const existingForm = m.form as MedicineForm | undefined;
    if (existingForm && existingForm !== 'other') {
      form = existingForm;
    } else if (/syrup|suspension|drops|liquid|solution|elixir|oral sol|cough syrup/i.test(fullText)) {
      form = 'syrup';
    } else if (/capsule|cap\b|softgel/i.test(fullText)) {
      form = 'capsule';
    } else if (/ampul|ampule|vial|injection|inj\b|iv\b|im\b/i.test(fullText)) {
      form = 'ampule';
    } else if (/powder|sachet|granule|ors/i.test(fullText)) {
      form = 'powder';
    } else if (/patch|tape|plaster/i.test(fullText)) {
      form = 'tape';
    } else if (/lotion|liniment|wash|gargle/i.test(fullText)) {
      form = 'liquid';
    } else if (/cream|ointment|gel\b|inhaler|spray/i.test(fullText)) {
      form = 'other';
    } else {
      form = 'tablet';
    }
  }

  return {
    id: m.id || '',
    category,
    categories,
    form
  };
}

export async function categorizeMedicinesWithAI(
  medicines: { id: string; name: string; dosage?: string; usageInstructions?: string; form?: string }[]
): Promise<CategorizedMedicineItem[]> {
  if (!medicines || medicines.length === 0) return [];
  const catPayload = JSON.stringify({ medicines });

  // 1. Try server-side AI classification with strict 3.5s timeout (prevent Android/mobile hang)
  try {
    const authHeaders = await getAuthHeader();
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;

    let response: Response | null = null;
    try {
      response = await fetch(getApiUrl('/api/ai/categorize'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: catPayload,
        signal: controller ? controller.signal : undefined
      });
    } catch (fetchErr) {
      console.warn("Primary AI categorize endpoint fetch notice:", fetchErr);
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (response && response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (data && data.success && Array.isArray(data.categorized) && data.categorized.length > 0) {
          return data.categorized;
        }
      } catch {
        // Response was not JSON, fallback immediately
      }
    }
  } catch (err) {
    console.info("Server categorization deferred, using on-device clinical intelligence:", err);
  }

  // 2. High-speed, 100% resilient on-device clinical pharmacology classification (0ms latency, works offline in Android APK)
  return medicines.map(m => classifyMedicineLocally(m));
}
