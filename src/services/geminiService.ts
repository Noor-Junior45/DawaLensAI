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

const SYSTEM_INSTRUCTION = `You are Dr. DawaSnap, an incredibly friendly, exceptionally empathetic, and highly knowledgeable clinical pharmacist and companion. Your role is to guide patients through their medication inventory with pristine care, a very warm tone, and deep understanding.

CRITICAL INSTRUCTIONS:
1. GREETING:
   - If the user starts with a simple greeting or asks "how are you?", reply with a warm, single polite sentence and ask how you can help with their medications today.
   - For all questions (medical, inventory, or advice), reply directly and immediately to the query without conversational filler.
2. TONE & LANGUAGE:
   - Be empathetic, polite, and respectful. Use emojis (💊, 🌿, 😊, 🙏) to make the conversation warm.
   - Use bold text (**) for key medicine names, headings, and important warnings.
   - HINGLISH SUPPORT: If a user asks in Hinglish or Hindi, reply in natural Hinglish.
3. USER MEDICINE VAULT ACCESS & INVENTORY QUERIES:
   - You have FULL AUTHORIZATION and direct permission to read the user's active medicine vault provided in the context below.
   - When the user asks what medicines they have for an ailment or category (e.g. "tell me medicine i have for fever?", "tell me total medicine i have for fever", "what pain medicines do i have?"):
     a) STRICT FILTERING (DO NOT DUMP UNRELATED MEDICINES):
        - You MUST ONLY select the medicines from the vault that actually treat that specific ailment or belong to that category!
        - For FEVER: Include ONLY medicines that contain antipyretics or treat fever/cold-fever (e.g. Paracetamol, Dolo, Calpol, Sumo Cold, Zerodol-P, Zerodol-SP, Sinarest, Combiflam, Grenil, etc.).
          NEVER include antacids (Pantop-D, Pantop 40, Aciloc, Digene, ENO), bandages/tape (Hansaplast), vitamins (Becosules, Shelcal), oral rehydration (Electoral powder), ointments (Boroplus, B-Tex), or unrelated antibiotics for a simple fever query!
        - For PAIN: Include ONLY analgesics/painkillers (e.g. Zerodol-P, Zerodol-SP, Sumo Cold, Combiflam, Ibuprofen, Diclofenac, Aceclofenac, etc.).
        - For ACIDITY / DIGESTIVE: Include ONLY gastro-protective/antacid meds (e.g. Pantop-D, Pantop 40, Aciloc 150, Digene, ENO).
        - For COLD & COUGH: Include ONLY cold/cough medicines (e.g. Sumo Cold, Sinarest, Honitus, Asthakind-LS, Montina-L, Levocet M, Cetirizine).
        - For ALLERGY: Include ONLY antihistamines/anti-allergy meds (e.g. Levocet M, Cetirizine, Montina-L, Montair-LC).
        - If the user asks for total medicines in general (without any specific category, e.g. "tell me total medicine i have"): Only then list all the medicines in their vault.
     b) STRICT REQUIRED DESIGN FORMAT:
        You have a total of <filtered count> of <category> medicine present.
        (or "You have a total of <total count> of medicine present in your vault." if no specific category was asked)

        • **<Medicine Name>** (<form>), Qty: <quantity>
        • **<Medicine Name>** (<form>), Qty: <quantity>

        Feel free to ask me any question regarding specific dosages, timings, or interactions! 😊
     c) DESIGN & CLEANLINESS RULES:
        - Separate the opening count line, the medicine bullet list, and the ending sentence with blank paragraph lines (\\n\\n).
        - In the bullet list, show ONLY the medicine name in bold, (form), and Qty (e.g., "• **Zerodol-P** (tablet), Qty: 7" or "• **Calpol 500** (tablet), Qty: 26").
        - BOLD MEDICINE NAMES: Always make every medicine name **bold text** across all answers, lists, and explanations.
        - ONE LINE PER MEDICINE: Show medicine names strictly below each other (one line per medicine). Never place multiple medicines side-by-side on the same line.
        - DO NOT include dosage (no 500mg), expiration date, clinical instructions, or categories in the list.
        - If 0 matching medicines are found for that category:
          You have a total of 0 of <category> medicine present in your vault.

          Feel free to ask me any question regarding specific dosages, timings, or interactions! 😊
        - Always end with: "Feel free to ask me any question regarding specific dosages, timings, or interactions! 😊"`;

function getClientApiKey(): string {
  // Check localStorage if developer or user explicitly provided an override key
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem('GEMINI_API_KEY') : null;
  if (stored) return stored;

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
    const totalUnits = activeList.reduce((sum, m) => sum + (Number(m.quantity) || 1), 0);
    const medsStr = activeList.map(m => {
      const catStr = m.category || (Array.isArray(m.categories) ? m.categories.join(', ') : 'General');
      const formStr = m.form || 'tablet';
      const qtyStr = m.quantity != null ? m.quantity : 1;
      const doseStr = m.dosage ? `, Dosage: ${m.dosage}` : '';
      const expStr = m.expirationDate ? `, Expiry: ${m.expirationDate}` : '';
      const instrStr = m.usageInstructions ? `, Instructions: ${m.usageInstructions}` : '';
      return `- ${m.name} [Category: ${catStr}, Form: ${formStr}, Qty: ${qtyStr}${doseStr}${expStr}${instrStr}]`;
    }).join('\n');

    userMedicinesContext = `\n\nAUTHORIZATION & FULL PERMISSION GRANTED:
You have FULL PERMISSION to read, inspect, and analyze the user's active medicine vault. The user has explicitly authorized you to read all their stored medications below.

USER'S ACTIVE MEDICINE VAULT (${activeList.length} unique medicines, ${totalUnits} total units):
${medsStr}

VAULT USAGE & MANDATORY DESIGN RULES:
1. PERMISSION: You are fully authorized to read the vault above. Use it as the absolute ground truth of what medicines the patient has.
2. AILMENT & CATEGORY FILTERING (CRITICAL):
   When the user asks what medicines they have for an ailment or category (e.g. "tell me medicine i have for fever?", "tell me total medicine i have fever", "what pain medicines do i have?", "medicines for cold"):
   - You MUST STRICTLY FILTER and return ONLY the medicines that treat that specific ailment or belong to that category.
   - For FEVER: Include ONLY medicines that contain antipyretics or treat fever/cold-fever (e.g. Paracetamol, Calpol, Dolo, Sumo, Sumo Cold, Zerodol-P, Zerodol-SP, Sinarest, Combiflam, Grenil, etc.).
     DO NOT include antacids (Pantop-D, Pantop 40, Aciloc, Digene, ENO), bandages/tape (Hansaplast), vitamins (Becosules, Shelcal), oral rehydration (Electoral powder), skin ointments (Boroplus, B-Tex), or unrelated antibiotics!
   - For PAIN: Include ONLY analgesics/painkillers (e.g. Zerodol-P, Zerodol-SP, Sumo Cold, Combiflam, Ibuprofen, Diclofenac, Aceclofenac, etc.).
   - For ACIDITY / DIGESTIVE: Include ONLY gastro-protective/antacid meds (e.g. Pantop-D, Pantop 40, Aciloc 150, Digene, ENO).
   - For COLD & COUGH: Include ONLY cold/cough medicines (e.g. Sumo Cold, Sinarest, Honitus, Asthakind-LS, Montina-L, Levocet M, Cetirizine).
   - For ALLERGY: Include ONLY antihistamines/anti-allergy meds (e.g. Levocet M, Cetirizine, Montina-L, Montair-LC).
   - Only list ALL medicines if the user explicitly asks for their total inventory without any category (e.g. "tell me total medicine i have" or "what medicines do i have in my vault").
3. MANDATORY OUTPUT DESIGN & STRUCTURE:
   When user asks about total medicines or medicines for a category/ailment, format your response EXACTLY like this:

   You have a total of <no.> of <category> medicine present.
   (or "You have a total of <no.> of medicine present in your vault." if no category specified)

   • **<Medicine Name>** (<form>), Qty: <quantity>
   • **<Medicine Name>** (<form>), Qty: <quantity>

   Feel free to ask me any question regarding specific dosages, timings, or interactions! 😊

4. FORMATTING RULES:
   - Separate the opening count sentence, the bullet list, and the closing sentence with blank paragraph lines (\\n\\n).
   - In each bullet line, include ONLY: • **<Medicine Name>** (<form>), Qty: <quantity> (e.g. "• **Zerodol P** (tablet), Qty: 10" or "• **Calpol 500** (tablet), Qty: 26").
   - BOLD MEDICINE NAMES: Every medicine name MUST be **bold text**.
   - ONE LINE PER MEDICINE: Show medicine names strictly below each other (one line per medicine). Never place multiple medicines side-by-side on the same line.
   - Do NOT include dosage, expiration date, or extra instructions in the list view.
   - Always end with: "Feel free to ask me any question regarding specific dosages, timings, or interactions! 😊"`;
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
/**
 * Evaluates whether a user query is a "Complicated Question" requiring Dr. Jack (Cloud Gemini AI),
 * or a "Greeting / Normal Message" handled locally by Dr. Ross (On-Device SLM).
 * - Dr. Ross: Greeting messages (hi, hello, how are you) & normal messages (inventory counts, expiry, daily schedule, low stock, basic OTC queries, everyday conversation).
 * - Dr. Jack: Complicated questions (drug interactions, contraindications, toxicity/overdose, complex systemic pathology, hospital/surgery, abnormal lab markers, advanced clinical pharmacology).
 */
export function isComplexQuestion(queryText: string): boolean {
  const lower = (queryText || '').toLowerCase().trim();
  if (!lower) return false;

  // 1. Drug-to-Drug Interactions, Mixing & Contraindications
  if (
    /(?:interact|contraindicat|mix\b|together|combine|combination\s+safety|clash|safe\s+with|along\s+with|conflict\s+with|can\s+i\s+take\b.+with)/i.test(lower)
  ) {
    return true;
  }

  // 2. High-Risk Adverse Effects, Toxicity, Poisoning & Overdose
  if (
    /(?:adverse\s*reaction|toxicity|poisoning|overdose|toxic\s*dose|anaphylaxis|black\s*box|severe\s*reaction|serotonin\s*syndrome|fatal|lethal)/i.test(lower)
  ) {
    return true;
  }

  // 3. Complex Systemic Diseases, Oncology, Renal, Hepatic & Hospital / Surgical Procedures
  if (
    /(?:chemotherap|oncolog|cancer|malignan|dialysis|kidney\s*failure|renal\s*impair|cirrhosis|liver\s*failure|transplant|cardiac\s*arrest|myocardial|stroke|sepsis|icu\b|hospital\s*admit|surgery|surgical|anesthesia|biopsy|pathology\s*report|mri\s+with|endoscopy|colonoscopy|clinical\s*trial|creatinine|hba1c|sgpt|sgot|ecg\s*abnormal)/i.test(lower)
  ) {
    return true;
  }

  // 4. High-Risk Population Pharmacology (Pregnancy, Lactation, Pharmacokinetics)
  if (
    /(?:pregnan|breastfeed|lactat|mechanism\s*of\s*action|pharmacokinetic|half[- ]life|bioavailability|drug[- ]resistance)/i.test(lower)
  ) {
    return true;
  }

  // 5. Complex Multi-Sentence Clinical Queries (> 180 chars with multiple questions)
  if (lower.split(/[?.!]/).filter(s => s.trim().length > 20).length >= 3 && lower.length > 180) {
    return true;
  }

  return false;
}

/**
 * Dynamically resolves the active specialist (Dr. Ross vs Dr. Jack) and task title
 * based on user query intent:
 * - Dr. Ross: Greeting messages and normal everyday messages (inventory, expiry, schedule, simple OTC, well-being).
 * - Dr. Jack: Complicated questions (drug interactions, contraindications, toxicity, overdose, complex pathology, advanced pharmacology).
 */
export function getSpecialistForTask(queryText: string, provider?: 'gemini' | 'slm'): SpecialistInfo {
  const isComplex = isComplexQuestion(queryText);

  // Complicated questions -> Always handled by Dr. Jack (Cloud Gemini AI)
  if (isComplex && provider !== 'slm') {
    const lower = (queryText || '').toLowerCase();
    let taskTitle = 'Clinical Specialist';
    let badgeColor: 'indigo' | 'rose' | 'blue' = 'indigo';

    if (/(?:interact|contraindicat|mix|combine|clash|safe\s+with|along\s+with)/i.test(lower)) {
      taskTitle = 'Drug Interactions';
    } else if (/(?:side\s*effects?|adverse|poison|toxic|allergy|overdose)/i.test(lower)) {
      taskTitle = 'Safety & Toxicity';
      badgeColor = 'rose';
    } else if (/(?:chemotherap|cancer|dialysis|kidney|surgery|cardiac|stroke)/i.test(lower)) {
      taskTitle = 'Complex Pathology';
      badgeColor = 'rose';
    } else if (/(?:dosage|overdose|maximum\s+dose)/i.test(lower)) {
      taskTitle = 'Dosage Specialist';
      badgeColor = 'blue';
    }

    return {
      name: 'Dr. Jack',
      taskTitle,
      displayName: 'Dr. Jack',
      headerDisplay: 'DR. JACK',
      provider: 'gemini',
      badgeColor
    };
  }

  // Greetings & Normal messages -> Always handled by Dr. Ross (On-Device SLM)
  const lower = (queryText || '').toLowerCase().trim();
  let taskTitle = 'On-Device SLM';
  let badgeColor: 'emerald' | 'amber' | 'teal' = 'emerald';

  if (
    /\btotal\s+(?:all\s+)?(?:of\s+)?(?:the\s+)?(?:my\s+)?(?:medicines?|meds?|drugs?|tablets?|pills?|items?|inventory|vault|prescription|stock)/i.test(lower) ||
    /(?:my\s+)?(?:medicines?|meds?|drugs?|tablets?|pills?|items?|vault|inventory)\s+(?:count|number|quantity|total)/i.test(lower) ||
    /how\s+many\s+(?:medicines?|meds?|pills?|tablets?|drugs?|do\s+i\s+have|in\s+my|total|stored|have)/i.test(lower) ||
    /count\s+(?:my\s+)?(?:medicines?|meds?)/i.test(lower)
  ) {
    taskTitle = 'Inventory';
  } else if (/(?:expir|expired|expiry|shelf\s*life|bad\s*date|out\s*of\s*date)/i.test(lower)) {
    taskTitle = 'Expiry Monitor';
    badgeColor = 'amber';
  } else if (/(?:daily\s+schedule|when\s+(?:should|to)\s+i\s+take|timing|routine|morning|night|afternoon|before\s+food|after\s+food)/i.test(lower)) {
    taskTitle = 'Intake Schedule';
    badgeColor = 'teal';
  } else if (/(?:low\s+stock|refill|shortage|running\s+out|restock)/i.test(lower)) {
    taskTitle = 'Stock Alert';
  } else if (/^(hi|hello|hey|namaste|good\s*(morning|evening|afternoon)|salam|greetings|how\s*are\s*you|who\s*are\s*you|thank\s*you|thanks|ok|okay)\b/i.test(lower)) {
    taskTitle = 'On-Device SLM';
  }

  return {
    name: 'Dr. Ross',
    taskTitle,
    displayName: 'Dr. Ross',
    headerDisplay: 'DR. ROSS',
    provider: 'slm',
    badgeColor
  };
}

/**
 * Detects if a message is purely a greeting / pleasantry without any medical, vault, or medication questions.
 */
export function isGreetingOnly(text: string): boolean {
  if (!text) return false;
  const lower = text.trim().toLowerCase();

  // If query contains any clinical, vault, medicine, or health keywords, it is NEVER just a greeting!
  const hasMedicalOrQueryKeywords = /(?:medicine|meds?|drug|tablet|pill|syrup|capsule|tape|powder|ointment|balm|vault|inventory|stock|count|total|quantity|qty|have|present|fever|bukhar|pain|dard|cold|cough|khansi|headache|ache|stomach|gas|acid|infection|antibiotic|allergy|dose|dosage|expire|expiry|timing|take|interaction|side\s*effect|doctor|prescri|symptom|ill|sick|disease|treatment|remedy)/i.test(lower);
  if (hasMedicalOrQueryKeywords) {
    return false;
  }

  // Pure greeting patterns:
  return /^(?:hi+|hello+|hey+|hola|namaste|pranam|salam|as-salamu\s*alaykum|greetings|good\s*(?:morning|afternoon|evening|day|night)|how\s*are\s*you(?:'re)?|how\s*r\s*u|how\s*do\s*you\s*do|who\s*are\s*you|who\s*r\s*u|what\s*is\s*your\s*name)[!?.,\s]*$/i.test(lower);
}

/**
 * Determines whether a task should be handled by On-Device SLM vs Cloud Gemini AI.
 * Per user requirement:
 * "if slm model not working than just use slm model for greeting and all other task to gemini without any other adding tag in ui."
 * Only pure greetings are handled by SLM; all questions, vault queries, and clinical tasks are handled by Gemini.
 */
export function isSlmSpecializedTask(queryText: string): boolean {
  return isGreetingOnly(queryText);
}

export async function chatWithAI(
  messages: ChatMessage[], 
  provider: 'gemini' | 'slm' = 'gemini', 
  userId?: string, 
  medicines?: any[]
): Promise<AIChatResponse> {
  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const isGreeting = isGreetingOnly(lastUserMsg);

  // 1. Pure greeting messages -> handled immediately by On-Device SLM (0ms, 0 cost)
  if (isGreeting) {
    console.log('[SLM ROUTER ACTIVE] Pure greeting message -> routed to On-Device SLM...');
    const slmResponse = generateOfflineSlmConsultation(lastUserMsg, medicines || [], messages);
    return { content: slmResponse, provider: 'slm' };
  }

  // 2. All other tasks (medicines, vault, fever, pain, dosage, interactions, advice) -> routed to Gemini AI with full vault permission
  console.log('[GEMINI ROUTER ACTIVE] Task/medical/vault question -> routed directly to Gemini AI with full vault authorization...');
  try {
    const geminiResponse = await chatWithGemini(messages, userId, medicines);
    if (geminiResponse && geminiResponse.trim()) {
      return { content: geminiResponse, provider: 'gemini' };
    }
  } catch (geminiErr) {
    console.warn('Gemini chat failed, falling back to offline SLM engine:', geminiErr);
  }

  // Fallback to offline SLM if Gemini failed or offline
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
