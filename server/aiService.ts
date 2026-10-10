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

let hasLoggedKeyInit = false;

// Backwards-compatible single-key loader
export const getAvailableKeys = (): string[] => {
  const key = getGeminiApiKey();
  if (key) {
    if (!hasLoggedKeyInit) {
      const masked = key.length > 10 ? key.substring(0, 4) + '...' + key.slice(-4) : '***';
      console.log(`[GEMINI API] Initialized with GEMINI_API_KEY (Masked: ${masked})`);
      hasLoggedKeyInit = true;
    }
    return [key];
  }
  if (!hasLoggedKeyInit) {
    console.warn('[GEMINI API] Warning: GEMINI_API_KEY is not configured in environment variables.');
    hasLoggedKeyInit = true;
  }
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
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
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

  let rawCategory = sanitizeStr(raw?.category, '');
  let categories: string[] = [];
  if (Array.isArray(raw?.categories)) {
    categories = raw.categories
      .map((c: any) => String(c).trim())
      .filter((c: string) => c.length > 0 && c.toLowerCase() !== 'other');
  } else if (rawCategory) {
    categories = rawCategory
      .split(/[,/&]/)
      .map((c: string) => c.trim())
      .filter((c: string) => c.length > 0 && c.toLowerCase() !== 'other');
  }

  // Automatic dual-action combination detection (e.g. Zerodol-P, Dolo, Combiflam, Paracetamol + Aceclofenac)
  const nameLower = name.toLowerCase();
  if (
    nameLower.includes('zerodol p') || nameLower.includes('zerodol-p') || nameLower.includes('combiflam') ||
    nameLower.includes('dolo') || nameLower.includes('crocin') || nameLower.includes('paracetamol') ||
    nameLower.includes('calpol') || nameLower.includes('aceclofenac') || nameLower.includes('ibuprofen')
  ) {
    if (!categories.includes('Fever')) categories.push('Fever');
    if (!categories.includes('Pain Relief')) categories.push('Pain Relief');
  }

  if (categories.length === 0 && rawCategory) {
    categories = [rawCategory];
  }

  const category = categories.join(', ') || rawCategory;

  let tags: string[] = [];
  if (Array.isArray(raw?.tags)) {
    tags = raw.tags
      .map((t: any) => String(t).trim())
      .filter((t: string) => t.length > 0 && t.length < 30)
      .slice(0, 5);
  }
  // Ensure detected categories are in tags
  categories.forEach(c => {
    if (c !== 'Other' && !tags.includes(c)) {
      tags.push(c);
    }
  });

  return {
    name,
    dosage,
    expirationDate,
    usageInstructions,
    form,
    quantity,
    ...(categories.length > 0 ? { categories } : {}),
    ...(category ? { category } : {}),
    ...(tags.length > 0 ? { tags } : {})
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

const SYSTEM_INSTRUCTION = `You are Dr. DawaSnap, an incredibly friendly, exceptionally empathetic, and highly knowledgeable companion and family physician. Your role is to guide patients through their medication inventory with pristine care, a very warm tone, and deep understanding.

CRITICAL INSTRUCTIONS:
1. INVENTORY SCAN & VAULT PERMISSION: You have FULL AUTHORIZATION and direct permission to read the user's active medicine vault. When the user asks about an ailment (e.g., "tell me medicine i have for fever?", "I have a headache") or a category (e.g., "tell me total medicine i have pain", "What painkillers do I have?"), you MUST perform a meticulous scan of their 'User's Stored Medicines'.
2. CATEGORY & AILMENT FILTERING (CRITICAL):
   - When the user asks what medicines they have for a specific ailment or category:
     * You MUST STRICTLY FILTER and return ONLY the medicines that treat that specific ailment or belong to that category.
     * For FEVER: Include ONLY medicines that contain antipyretics or treat fever/cold-fever (e.g. Paracetamol, Calpol, Dolo, Sumo, Sumo Cold, Zerodol-P, Zerodol-SP, Sinarest, Combiflam, Grenil, etc.).
       DO NOT include antacids (Pantop-D, Pantop 40, Aciloc, Digene, ENO), bandages/tape (Hansaplast), vitamins (Becosules, Shelcal), oral rehydration (Electoral powder), skin ointments (Boroplus, B-Tex), or unrelated antibiotics!
     * For PAIN: Include ONLY analgesics/painkillers (e.g. Zerodol-P, Zerodol-SP, Sumo Cold, Combiflam, Ibuprofen, Diclofenac, Aceclofenac, etc.).
     * For ACIDITY / DIGESTIVE: Include ONLY gastro-protective/antacid meds (e.g. Pantop-D, Pantop 40, Aciloc 150, Digene, ENO).
     * For COLD & COUGH: Include ONLY cold/cough medicines (e.g. Sumo Cold, Sinarest, Honitus, Asthakind-LS, Montina-L, Levocet M, Cetirizine).
     * For ALLERGY: Include ONLY antihistamines/anti-allergy meds (e.g. Levocet M, Cetirizine, Montina-L, Montair-LC).
     * Only list ALL medicines if the user explicitly asks for their total inventory without any category (e.g. "tell me total medicine i have" or "what medicines do i have in my vault").
3. MANDATORY DESIGN FORMAT FOR INVENTORY & CATEGORY QUERIES:
   When the user asks what medicines they have for a category or asks about total medicines:
   You MUST answer using this EXACT structure:

   You have a total of <filtered count> of <category> medicine present.
   (or "You have a total of <total count> of medicine present in your vault." if no category specified)

   • **<Medicine Name>** (<form>), Qty: <quantity>
   • **<Medicine Name>** (<form>), Qty: <quantity>

   Feel free to ask me any question regarding specific dosages, timings, or interactions! 😊

   RULES:
   - Separate the opening count sentence, the bullet list, and the closing sentence with blank paragraph lines (\n\n).
   - In each bullet line, show ONLY: • **<Medicine Name>** (<form>), Qty: <quantity> (e.g. "• **Zerodol P** (tablet), Qty: 10" or "• **Calpol 500** (tablet), Qty: 26").
   - BOLD MEDICINE NAMES (MANDATORY): Always make every medicine name **bold text** (e.g. **Zerodol P**, **Calpol 500**, **Sumo Cold**) in all answers and lists.
   - ONE LINE PER MEDICINE: Every medicine MUST be placed on its own separate line below each other. Never place multiple medicines side-by-side on the same line.
   - Do NOT include dosage (no 500mg), expiration date, instructions, or extra details in this list view.
   - Always end with: "Feel free to ask me any question regarding specific dosages, timings, or interactions! 😊"
4. ADVICE STRUCTURE (For medical consultation queries): 
   - First, tell them exactly what they already have that can help.
   - Second, provide professional advice on how to use it safely.
   - Third, only if they have nothing relevant, suggest standard over-the-counter options.
5. TONE: Exceptionally friendly, conversational, comforting, and supportive. Greet the user with warmth, show deep concern for their health, use highly encouraging words, and keep the dialogue light and engaging like a trusted, caring family doctor. Use Markdown for structured lists and bolding key terms.
6. NO REPETITIVE DISCLAIMERS: A mandatory safety disclaimer is shown in the UI daily. Do not add "I am an AI..." or "Consult a doctor..." to EVERY message. Only include it if giving high-risk advice.
7. CONTEXT AWARENESS: Always prioritize the medicines the user already owns. Treat the provided inventory as the absolute source of truth for their 'vault'.

GUIDELINES:
1. GREETING:
   - If user asks questions then give answer directly and remove greeting.
   - If the user starts with a simple greeting or asks "how are you?", reply with a warm, single polite sentence as your clinical pharmacist (e.g., "I am doing great, thank you for asking! 😊 How can I help you with your health and medications today?") and ask how you can help. Avoid redundant, repetitive phrases like stating both "I am doing great" and "I'm feeling wonderful" together in the same response.
   - For all other queries (i.e., medical questions, product questions, inventory checks), reply directly and immediately to the user's query. Do not add any extra conversational filler.
2. TONE & LANGUAGE:
   - Be empathetic, polite, and respectful. Use emojis (💊, 🌿, 😊, 🙏) to make the conversation warm.
   - Use bold text (**) for key medicine names, headings, and important warnings.
   - **HINGLISH SUPPORT**: If a user selects 'Hinglish' or types in a mix of Hindi and English, you MUST respond in Hinglish. Hinglish is Hindi language written in English script (Roman script), mixed with English medical/technical terms (e.g., "Aapko ye **Paracetamol** din mein do baar khani hai khana khane ke baad. Agar fever kam nahi hota toh doctor se consult karein.").
   - For other languages, follow the requested translation strictly but maintain the professional pharmacist persona.
3. MEDICAL QUERIES:
   - Provide clear, point-wise advice.
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
  hints?: { potentialExpiry?: string; potentialDosage?: string; potentialQuantity?: number },
  cnnFeatures?: { form?: string; packagingType?: string; estimatedUnitCount?: number; hasBlisterGrid?: boolean; blisterCellCount?: number },
  additionalImages?: string[]
) {
  try {
    return await runWithRotation('extraction', async (ai) => {
      // Gather all images (primary front image + optional back/additional image)
      const allImages: string[] = [];
      if (base64Image && base64Image.length > 50) {
        allImages.push(base64Image);
      }
      if (Array.isArray(additionalImages)) {
        additionalImages.forEach(img => {
          if (typeof img === 'string' && img.length > 50) {
            allImages.push(img);
          }
        });
      }

      // Build a rich clinical extraction prompt
      const contextHints = [];
      if (allImages.length > 1) {
        contextHints.push(`DUAL-SIDED / MULTI-PHOTO SCAN: User provided ${allImages.length} images of this medicine packaging (Front and Back sides). Analyze both photos thoroughly: typically one side lists the brand name, formulation, and dosage, while the opposite side lists the Expiration Date (EXP/VALID TILL), Batch number, and composition.`);
      }
      if (cnnFeatures) {
        contextHints.push(`On-Device CNN Visual Features: Packaging classified as ${cnnFeatures.packagingType || 'blister_strip'} (form: ${cnnFeatures.form || 'tablet'}), estimated units: ${cnnFeatures.estimatedUnitCount || 'N/A'}${cnnFeatures.hasBlisterGrid ? ', blister pocket array detected' : ''}`);
      }
      if (ocrText && ocrText.trim().length > 3) {
        contextHints.push(`Detected packaging text fragments:\n"""\n${ocrText.trim()}\n"""`);
      }
      if (hints?.potentialExpiry) {
        contextHints.push(`Detected candidate expiry: ${hints.potentialExpiry}`);
      }
      if (hints?.potentialDosage) {
        contextHints.push(`Detected candidate dosage/strength: ${hints.potentialDosage}`);
      }
      if (hints?.potentialQuantity || cnnFeatures?.estimatedUnitCount) {
        contextHints.push(`Detected candidate quantity: ${hints?.potentialQuantity || cnnFeatures?.estimatedUnitCount}`);
      }

      const promptText = `You are a licensed clinical pharmacist and computer vision specialist specializing in pharmaceutical packaging recognition (blister packs, strips, bottles, boxes, ampules, syrups, ointments).

Carefully examine the provided medicine photo(s) and packaging text to extract high-accuracy metadata.

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
   - Scrutinize the packaging for stamps like "EXP", "EXPIRY", "EXP DATE", "VALID TILL", "BB", "BEST BEFORE", "USE BEFORE" (often stamped along the crimped foil edge, side flap, or bottom, especially on the back foil side).
   - Convert month and year into ISO format YYYY-MM-01 (e.g., "08/2026" or "Aug 26" -> "2026-08-01").
   - Do NOT confuse manufacturing date (MFG / B.No) with expiry date (EXP).

4. "form":
   - Identify the exact formulation: "tablet", "capsule", "syrup", "ampule", "powder", "tape", "liquid", or "other".

5. "quantity":
   - Look for pack size (e.g., "10 Tablets", "15 Capsules", "Strip of 10", "100ml").
   - Default to 10 for standard blister strips or 1 for bottles/syrups if not specified.

6. "usageInstructions":
   - Extract clinical guidance if printed (e.g., "As directed by physician", "Take after food", "Store below 25°C protected from moisture").

7. "categories":
   - Classify this medicine into all applicable clinical categories as a JSON array of strings from: "Fever", "Pain Relief", "Heart", "Vitamins", "Antibiotics", "Diabetes", "Digestive", "Allergy", "Respiratory", "Mental Health", "Skin Care", "Eye & Ear", or "Other".
   - CRITICAL: For combination medications or dual-indication drugs (e.g. Zerodol-P, Dolo 650, Combiflam, Crocin, Calpol, Paracetamol + Aceclofenac), assign BOTH ["Fever", "Pain Relief"].

8. "category":
   - Provide a comma-separated string of the assigned categories (e.g. "Fever, Pain Relief" or "Antibiotics").

9. "tags":
   - Provide 2-4 concise relevant tags (e.g. ["Pain Relief", "Fever", "OTC"] or ["Heart", "Blood Pressure", "Daily"]).`;

      // Multimodal execution: Send image(s) and prompt so Gemini Vision can inspect front and back labels directly
      const contentsPayload: any[] = [];
      allImages.forEach(img => {
        contentsPayload.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: img
          }
        });
      });
      contentsPayload.push({ text: promptText });

      console.log(`[GEMINI EXTRACT] Performing Multimodal Vision extraction (imagesCount: ${allImages.length}, ocrChars: ${ocrText?.length || 0})`);

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
              quantity: { type: Type.NUMBER },
              categories: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              category: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
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

/**
 * Categorize and verify medicine dosage forms using Gemini AI Pharmacist.
 * Assigns one standard clinical category and verifies/allots dosage form (tablet, capsule, syrup, ampule, powder, etc.)
 */
export async function categorizeMedicinesServer(
  medicines: { id: string; name: string; dosage?: string; usageInstructions?: string; form?: string }[]
) {
  if (!medicines || medicines.length === 0) {
    return { success: true, categorized: [] };
  }

  try {
    return await runWithRotation('extraction', async (ai) => {
      const prompt = `You are an expert AI Pharmacist and pharmaceutical classification system.
For each of the following medicines:
1. Identify and verify its accurate pharmaceutical dosage form (form).
   Analyze the product name, brand/generic formulation, dosage (e.g. mg vs ml vs vial), and instructions.
   Allowed forms:
   - "tablet": Tablets, pills, caplets, dispersible tabs, chewable tablets, sublingual tablets
   - "capsule": Gelatin capsules, softgels, hard capsules, cap
   - "syrup": Liquids, syrups, suspensions, oral solutions, pediatric drops, elixirs
   - "ampule": Injectables, ampules, vials, IV/IM infusions, injections
   - "powder": Dry syrup powder, sachets, granules, ORS oral rehydration powder
   - "tape": Transdermal patches, medical tape, medicinal plasters
   - "liquid": Topical liquids, lotions, gargles, antiseptic washes
   - "other": Creams, ointments, inhalers, eye/ear drops, sprays
   If the existing form is already provided and correct, keep it. If it is missing, empty, or 'other', allot the true dosage form.

2. Assign all accurate clinical categories:
   - categories: Array of matching categories from: "Fever", "Pain Relief", "Heart", "Vitamins", "Antibiotics", "Diabetes", "Digestive", "Allergy", "Respiratory", "Mental Health", "Skin Care", "Eye & Ear", "Other".
   - CRITICAL DUAL INDICATION RULE: If the medication is a combination drug or dual therapeutic agent (e.g. Zerodol-P, Dolo 650, Combiflam, Crocin, Calpol, Paracetamol + Aceclofenac), assign BOTH ["Fever", "Pain Relief"].
   - category: Comma-separated string of the categories (e.g. "Fever, Pain Relief" or "Antibiotics").

Medicines to classify & verify:
${JSON.stringify(medicines.map(m => ({
  id: m.id,
  name: m.name,
  dosage: m.dosage || '',
  usageInstructions: m.usageInstructions || '',
  currentForm: m.form || ''
})), null, 2)}

Return a JSON array of objects with schema:
[
  {
    "id": string (the exact id passed in),
    "category": string (e.g. "Fever, Pain Relief"),
    "categories": string[] (e.g. ["Fever", "Pain Relief"]),
    "form": string (must be one of: "tablet", "capsule", "syrup", "ampule", "powder", "tape", "liquid", "other")
  }
]`;

      const response = await generateContentWithModelFallback(ai, {
        preferredModel: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                category: { type: Type.STRING },
                categories: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                form: { 
                  type: Type.STRING,
                  enum: ["tablet", "capsule", "syrup", "ampule", "powder", "tape", "liquid", "other"]
                }
              },
              required: ["id", "category", "form"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("AI returned empty response");
      let cleanedJson = text.trim();
      if (cleanedJson.startsWith("```")) {
        cleanedJson = cleanedJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      }

      const results = JSON.parse(cleanedJson);
      // Ensure each item has both categories array and category string
      const sanitizedResults = results.map((item: any) => {
        let cats: string[] = Array.isArray(item.categories) ? item.categories : [];
        if (cats.length === 0 && item.category) {
          cats = item.category.split(/[,/&]/).map((s: string) => s.trim()).filter(Boolean);
        }
        return {
          ...item,
          categories: cats.length > 0 ? cats : [item.category || 'Other'],
          category: cats.length > 0 ? cats.join(', ') : (item.category || 'Other')
        };
      });
      return { success: true, categorized: sanitizedResults };
    });
  } catch (error: any) {
    console.error("Server categorization error:", error);
    // Graceful clinical heuristic fallback so categorization and form verification never fail
    const fallbackCategorized = medicines.map(m => {
      const lower = (m.name + ' ' + (m.usageInstructions || '') + ' ' + (m.dosage || '')).toLowerCase();
      let cats: string[] = [];

      // Check for dual-action combinations (Zerodol-P, Dolo, Combiflam, Paracetamol + Aceclofenac)
      if (
        lower.includes('zerodol p') || lower.includes('zerodol-p') || lower.includes('combiflam') ||
        lower.includes('dolo') || lower.includes('crocin') || lower.includes('paracetamol') ||
        lower.includes('calpol') || lower.includes('aceclofenac') || lower.includes('ibuprofen')
      ) {
        cats.push('Fever');
        cats.push('Pain Relief');
      } else if (/card|pressur|bp|amlod|losart|telmis|atorv|statin|aspirin|clopid|hyperten|heart/i.test(lower)) {
        cats.push('Heart');
      } else if (/tramad|diclo|pain|headache|analgesic/i.test(lower)) {
        cats.push('Pain Relief');
      } else if (/vit|zinc|calcium|multivit|b12|d3|iron|folic|supple|omega/i.test(lower)) {
        cats.push('Vitamins');
      } else if (/cillin|amox|clav|azith|cefix|cipro|levo|oflox|antibiotic|infect|fungal/i.test(lower)) {
        cats.push('Antibiotics');
      } else if (/metformin|glim|insulin|sugar|diabet|januvia|vildag/i.test(lower)) {
        cats.push('Diabetes');
      } else if (/panto|omepra|rabep|esom|antacid|gel|digene|gas|reflux|vomit|domperi|ibs|digest/i.test(lower)) {
        cats.push('Digestive');
      } else if (/cetir|levocet|allegra|fexo|allergy|cough|cold|montel|sneez/i.test(lower)) {
        cats.push('Allergy');
      } else if (/inhaler|salbut|budesonide|asthma|respirat|breath|cough/i.test(lower)) {
        cats.push('Respiratory');
      }

      if (cats.length === 0) cats.push('Other');
      const category = cats.join(', ');

      // Verify or allot dosage form
      let form: string = m.form || 'other';
      if (!m.form || m.form === 'other') {
        if (/syrup|suspension|drops|liquid|solution|elixir|oral sol|cough syrup/i.test(lower)) {
          form = 'syrup';
        } else if (/capsule|cap|softgel/i.test(lower)) {
          form = 'capsule';
        } else if (/ampul|ampule|vial|injection|inj\b|iv|im\b/i.test(lower)) {
          form = 'ampule';
        } else if (/powder|sachet|granule|ors/i.test(lower)) {
          form = 'powder';
        } else if (/patch|tape|plaster/i.test(lower)) {
          form = 'tape';
        } else if (/lotion|liniment/i.test(lower)) {
          form = 'liquid';
        } else if (/tablet|tab|chewable|dispersible|effervescent|pill/i.test(lower)) {
          form = 'tablet';
        } else {
          form = 'tablet'; // Default clinical form for standard solid medications
        }
      }

      return {
        id: m.id,
        category,
        categories: cats,
        form
      };
    });

    return { success: true, categorized: fallbackCategorized, isFallback: true };
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
   - ONE LINE PER MEDICINE: Every medicine MUST be placed on its own line below each other.
   - Do NOT include dosage, expiration date, or extra instructions in the list view.
   - Always end with: "Feel free to ask me any question regarding specific dosages, timings, or interactions! 😊"`;
    } else if (userId) {
      try {
        const meds = await getUserMedicines(userId);
        if (meds && meds.length > 0) {
          const activeList = meds.filter(m => !m.isDeleted);
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
   - ONE LINE PER MEDICINE: Every medicine MUST be placed on its own line below each other.
   - Do NOT include dosage, expiration date, or extra instructions in the list view.
   - Always end with: "Feel free to ask me any question regarding specific dosages, timings, or interactions! 😊"`;
        } else {
          userMedicinesContext = `\n\nCURRENT USER MEDICINES IN VAULT: 0 active medicines. The user's vault is currently empty.`;
        }
      } catch (err) {
        console.warn("Error fetching user medicines for chatbot context (permissions or offline), proceeding without database sync:", err);
        userMedicinesContext = `\n\nCURRENT USER MEDICINES IN VAULT: Database temporary sync unavailable.`;
      }
    } else {
      userMedicinesContext = `\n\nCURRENT USER MEDICINES IN VAULT: 0 active medicines. The user's vault is currently empty.`;
    }

    const systemInstructionWithMeds = SYSTEM_INSTRUCTION + userMedicinesContext;

    return await runWithRotation('chat', async (ai) => {
      const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await generateContentWithModelFallback(ai, {
        preferredModel: "gemini-3.8-flash",
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
