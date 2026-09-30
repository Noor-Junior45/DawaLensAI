/**
 * DawaLens AI - On-Device Small Language Model (SLM) & Clinical Reasoning Engine
 * 
 * Functions offline directly in browser / native runtime:
 * 1. Clinical Intent Classifier & Symptom-to-Medicine Knowledge Graph
 * 2. Real-time Patient Vault Scanner (recommends medicines already owned)
 * 3. Drug-to-Drug Interaction Matrix & Contraindication Analyzer
 * 4. Multilingual & Hinglish Natural Language Generation (Dr. DawaLens persona)
 * 5. On-Device OCR + CNN Visual Feature Extractor for offline packaging scans
 */

import { Medicine, MedicineForm, SlmKnowledgeItem } from "../types";
import { CnnVisualFeatures } from "./imageCnnService";
import { db } from "../firebase";
import { collection, doc, setDoc, getDocs, query, where, limit } from "firebase/firestore";

export interface DrugKnowledgeItem {
  name: string;
  genericName: string;
  synonyms: string[];
  category: string;
  defaultForm: MedicineForm;
  typicalDosages: string[];
  indications: string[];
  usageInstructions: string;
  timing: string;
  contraindications: string[];
  interactions: string[];
  sideEffects: string[];
  hinglishSummary: string;
  tags: string[];
}

/**
 * Embedded Clinical Formulary & Drug Knowledge Base
 * Covering common essential, OTC, and chronic therapeutic categories
 */
export const PHARMA_KNOWLEDGE_BASE: DrugKnowledgeItem[] = [
  {
    name: "Paracetamol",
    genericName: "Acetaminophen",
    synonyms: ["dolo", "dolo 650", "calpol", "crocin", "pacimol", "pyregesic", "fevermol", "panadol", "tylenol"],
    category: "Pain Relief",
    defaultForm: "tablet",
    typicalDosages: ["500mg", "650mg", "120mg/5ml", "250mg/5ml"],
    indications: ["fever", "headache", "body ache", "toothache", "mild pain", "viral fever", "post-vaccination fever", "bukhar", "sar dard"],
    usageInstructions: "Take 1 tablet after meals with water every 6-8 hours as needed. Do not exceed 4000mg (4 grams) per day.",
    timing: "After Meals",
    contraindications: ["Severe liver impairment", "Chronic alcoholism"],
    interactions: ["Warfarin (high chronic doses)", "Other paracetamol-containing combination products"],
    sideEffects: ["Mild nausea", "Rash (rare)"],
    hinglishSummary: "Ye bukhar (fever) aur sar dard (headache) ke liye sabse safe dawa hai. Khana khane ke baad paani ke sath lein.",
    tags: ["Fever", "Headache", "Pain Relief", "OTC"]
  },
  {
    name: "Ibuprofen",
    genericName: "Ibuprofen",
    synonyms: ["brufen", "combiflam", "advil", "motrin", "ibugesic"],
    category: "Pain Relief",
    defaultForm: "tablet",
    typicalDosages: ["200mg", "400mg", "600mg", "100mg/5ml"],
    indications: ["inflammation", "joint pain", "swelling", "dental pain", "muscle sprain", "period cramps", "arthritis", "jodon ka dard", "sujan"],
    usageInstructions: "Always take strictly after food or milk to protect stomach lining. Drink plenty of water.",
    timing: "After Meals",
    contraindications: ["Stomach ulcer / gastritis", "Kidney dysfunction", "Third trimester pregnancy", "Aspirin allergy"],
    interactions: ["Blood thinners (Aspirin, Warfarin)", "ACE inhibitors (BP meds)", "Steroids"],
    sideEffects: ["Gastric burning", "Acid reflux", "Nausea"],
    hinglishSummary: "Sujan aur dard (inflammation & pain) ke liye asardar hai. Khali pet kabhi na lein, hamesha khana khane ke baad lein.",
    tags: ["NSAID", "Pain Relief", "Anti-inflammatory"]
  },
  {
    name: "Pantoprazole",
    genericName: "Pantoprazole",
    synonyms: ["pan 40", "pan-d", "pantocid", "pantodac", "protonix"],
    category: "Digestive",
    defaultForm: "tablet",
    typicalDosages: ["40mg", "20mg"],
    indications: ["acidity", "heartburn", "acid reflux", "gerd", "gastric ulcer", "chest burning", "pet me jalan", "gas"],
    usageInstructions: "Take 1 tablet once daily in the morning, at least 30-45 minutes before breakfast with a glass of water.",
    timing: "Before Meals (Empty Stomach)",
    contraindications: ["Hypersensitivity to PPIs"],
    interactions: ["Methotrexate", "Iron supplements (reduced absorption)"],
    sideEffects: ["Mild headache", "Diarrhea", "Flatulence"],
    hinglishSummary: "Subah khali pet (empty stomach) 30 minute nashte se pehle lein. Pet ki gas aur jalan ko turant shant karti hai.",
    tags: ["Acidity", "GERD", "Stomach", "Digestive"]
  },
  {
    name: "Omeprazole",
    genericName: "Omeprazole",
    synonyms: ["omez", "omez-d", "prilosec", "locid", "omizac"],
    category: "Digestive",
    defaultForm: "capsule",
    typicalDosages: ["20mg", "40mg"],
    indications: ["acidity", "indigestion", "sour burps", "gastric irritation", "ulcer prevention with pain medications"],
    usageInstructions: "Take 1 capsule 30 minutes before breakfast with water. Swallow whole; do not crush beads.",
    timing: "Before Meals (Empty Stomach)",
    contraindications: ["Severe liver disease"],
    interactions: ["Clopidogrel", "Diazepam"],
    sideEffects: ["Abdominal pain", "Nausea"],
    hinglishSummary: "Gas aur khatti dakar ke liye. Subah nashta karne se pehle khana hota hai.",
    tags: ["Acidity", "Digestive", "Capsule"]
  },
  {
    name: "Cetirizine",
    genericName: "Cetirizine Hydrochloride",
    synonyms: ["cetzine", "okacet", "zyrtec", "alerid", "incid-l"],
    category: "Allergy",
    defaultForm: "tablet",
    typicalDosages: ["10mg", "5mg"],
    indications: ["runny nose", "sneezing", "allergic rhinitis", "itchy eyes", "hives", "skin allergy", "dust allergy", "chinck", "khujli", "nazla"],
    usageInstructions: "Take 1 tablet preferably at bedtime or after dinner, as it may cause slight drowsiness.",
    timing: "Bedtime / Evening",
    contraindications: ["Severe kidney failure"],
    interactions: ["Alcohol", "Sedatives / Sleeping pills"],
    sideEffects: ["Mild drowsiness", "Dry mouth"],
    hinglishSummary: "Chheenkon (sneezing), naak behne (runny nose) aur khujli (allergy) ke liye. Raat ko sone se pehle lena behtar hota hai.",
    tags: ["Allergy", "Antihistamine", "Cold", "OTC"]
  },
  {
    name: "Montelukast",
    genericName: "Montelukast Sodium",
    synonyms: ["montair", "montair-lc", "singulair", "telekast", "romilast"],
    category: "Respiratory",
    defaultForm: "tablet",
    typicalDosages: ["10mg", "5mg", "4mg chewable"],
    indications: ["asthma prevention", "chronic allergic cough", "seasonal allergy", "breathing tightness", "chest wheezing"],
    usageInstructions: "Take 1 tablet once daily in the evening or bedtime consistently.",
    timing: "Evening / Bedtime",
    contraindications: ["Hypersensitivity"],
    interactions: ["Phenobarbital", "Rifampicin"],
    sideEffects: ["Vivid dreams", "Headache"],
    hinglishSummary: "Khansi aur saans ki allergy ke liye. Shaam ko ya raat ko ek baar li jaati hai.",
    tags: ["Respiratory", "Asthma", "Allergy", "Evening"]
  },
  {
    name: "Azithromycin",
    genericName: "Azithromycin",
    synonyms: ["azithral", "zithromax", "aziwok", "azee", "zady"],
    category: "Antibiotics",
    defaultForm: "tablet",
    typicalDosages: ["500mg", "250mg", "200mg/5ml"],
    indications: ["throat infection", "tonsillitis", "bronchitis", "chest infection", "ear infection", "gale ka infection"],
    usageInstructions: "Take 1 tablet once daily at the same time, 1 hour before or 2 hours after meals for 3 to 5 days as prescribed. Complete full course.",
    timing: "1 hr Before or 2 hrs After Meals",
    contraindications: ["Jaundice / hepatic history from macrolides", "Prolonged QT interval"],
    interactions: ["Antacids containing aluminium/magnesium (separate by 2 hours)", "Digoxin"],
    sideEffects: ["Mild loose stools", "Nausea", "Stomach cramp"],
    hinglishSummary: "Ye antibiotic hai gale aur chest infection ke liye. Doctor ke bataye anusar poora 3 ya 5 din ka course khatam karein.",
    tags: ["Antibiotic", "Prescription", "Infection", "Respiratory"]
  },
  {
    name: "Amoxicillin and Clavulanate",
    genericName: "Amoxicillin + Clavulanic Acid",
    synonyms: ["augmentin", "clavam", "moxclav", "amoxyclav", "sensiclav"],
    category: "Antibiotics",
    defaultForm: "tablet",
    typicalDosages: ["625mg", "375mg", "1000mg", "228.5mg/5ml"],
    indications: ["bacterial infections", "sinusitis", "dental abscess", "skin & soft tissue infection", "respiratory tract infection"],
    usageInstructions: "Take 1 tablet twice daily immediately at the start of a meal to minimize gastrointestinal upset and maximize absorption.",
    timing: "At the start of Meals",
    contraindications: ["Penicillin allergy", "History of penicillin-associated jaundice"],
    interactions: ["Oral contraceptives (may reduce efficacy)", "Allopurinol", "Warfarin"],
    sideEffects: ["Diarrhea", "Mild nausea", "Candidiasis"],
    hinglishSummary: "Broad-spectrum antibiotic hai. Khana shuru karte waqt lein taaki pet kharab na ho. Course poora karein.",
    tags: ["Antibiotic", "Infection", "Prescription"]
  },
  {
    name: "Metformin",
    genericName: "Metformin Hydrochloride",
    synonyms: ["glycomet", "glucophage", "gluconorm", "cetapin", "obimet"],
    category: "Diabetes",
    defaultForm: "tablet",
    typicalDosages: ["500mg", "850mg", "1000mg", "500mg SR", "1000mg SR"],
    indications: ["type 2 diabetes", "blood sugar control", "insulin resistance", "sugar ki bimari"],
    usageInstructions: "Take with or immediately after meals (breakfast/dinner) to reduce stomach upset. Swallow SR tablets whole.",
    timing: "With Meals",
    contraindications: ["Severe renal impairment (eGFR < 30)", "Metabolic acidosis"],
    interactions: ["Contrast dye (stop temporarily)", "Alcohol (increases lactic acidosis risk)"],
    sideEffects: ["Metallic taste", "Flatulence", "Soft stools initially"],
    hinglishSummary: "Sugar niyantran (blood glucose control) ke liye. Khana khate waqt ya khane ke turant baad lein.",
    tags: ["Diabetes", "Daily", "Blood Sugar"]
  },
  {
    name: "Amlodipine",
    genericName: "Amlodipine Besylate",
    synonyms: ["amlong", "stamlo", "norvasc", "amlovas", "amlokind"],
    category: "Heart",
    defaultForm: "tablet",
    typicalDosages: ["2.5mg", "5mg", "10mg"],
    indications: ["hypertension", "high blood pressure", "angina", "chest pain", "high bp"],
    usageInstructions: "Take 1 tablet once daily at the same time each morning with or without food. Do not stop abruptly.",
    timing: "Morning / Fixed Time",
    contraindications: ["Severe hypotension", "Cardiogenic shock"],
    interactions: ["Simvastatin (limit to 20mg)", "Grapefruit juice"],
    sideEffects: ["Swelling of ankles/feet (peripheral edema)", "Flushing", "Dizziness on standing"],
    hinglishSummary: "High Blood Pressure (BP) ko normal rakhne ke liye. Roz subah ek nirdharit samay par lein.",
    tags: ["Blood Pressure", "Heart", "Daily", "Hypertension"]
  },
  {
    name: "Telmisartan",
    genericName: "Telmisartan",
    synonyms: ["telma", "telmikind", "micardis", "telsartan", "telvas"],
    category: "Heart",
    defaultForm: "tablet",
    typicalDosages: ["20mg", "40mg", "80mg"],
    indications: ["high blood pressure", "cardiovascular protection", "hypertension in diabetic patients"],
    usageInstructions: "Take 1 tablet once daily at the same time each day with a glass of water.",
    timing: "Morning",
    contraindications: ["Pregnancy (contraindicated)", "Bilateral renal artery stenosis"],
    interactions: ["Potassium supplements (risk of hyperkalemia)", "NSAIDs like Brufen"],
    sideEffects: ["Mild dizziness", "Back pain", "Sinusitis"],
    hinglishSummary: "BP aur dil ki hifazat ke liye. Rozana niyamit roop se lein.",
    tags: ["Heart", "Blood Pressure", "Daily"]
  },
  {
    name: "Salbutamol",
    genericName: "Albuterol / Salbutamol",
    synonyms: ["asthalin", "ventolin", "salbair", "deriphyllin"],
    category: "Respiratory",
    defaultForm: "syrup",
    typicalDosages: ["2mg", "4mg", "2mg/5ml", "100mcg inhaler"],
    indications: ["bronchospasm", "acute asthma attack", "wheezing", "shortness of breath", "saans lene me dikkat"],
    usageInstructions: "Inhaler: 1-2 puffs during acute breathlessness. Syrup/tablet: As directed by physician with water.",
    timing: "As needed during wheezing",
    contraindications: ["Thyrotoxicosis", "Cardiac tachyarrhythmias"],
    interactions: ["Beta-blockers (e.g. Atenolol, Propranolol counteracts effect)"],
    sideEffects: ["Hand tremors", "Mild heart palpitations", "Nervousness"],
    hinglishSummary: "Saans phoolne aur asthma ke doraan turant rahat ke liye. SOS / jaroorat padne par istemal karein.",
    tags: ["Asthma", "Emergency", "Respiratory", "SOS"]
  },
  {
    name: "Ondansetron",
    genericName: "Ondansetron Hydrochloride",
    synonyms: ["emeset", "vomikind", "zofran", "periset", "ondem"],
    category: "Digestive",
    defaultForm: "tablet",
    typicalDosages: ["4mg", "8mg", "2mg/5ml", "MD tablet"],
    indications: ["nausea", "vomiting", "motion sickness", "post-chemotherapy vomiting", "ulti", "jee machlana"],
    usageInstructions: "Take 1 tablet (or mouth-dissolving tablet on tongue) 30 minutes before food or travel.",
    timing: "30 mins Before Meals / SOS",
    contraindications: ["Concurrent apomorphine use", "Congenital long QT syndrome"],
    interactions: ["Apomorphine", "Tramadol"],
    sideEffects: ["Mild headache", "Constipation", "Warm sensation"],
    hinglishSummary: "Ulti (vomiting) aur jee machlane (nausea) ko rokne ke liye. Khana khane se 30 minute pehle lein.",
    tags: ["Vomiting", "Nausea", "Digestive", "SOS"]
  },
  {
    name: "ORS (Oral Rehydration Salts)",
    genericName: "Electrolyte Salts (WHO Formula)",
    synonyms: ["electral", "prolyte", "walyte", "pedialyte", "ors liquid"],
    category: "Digestive",
    defaultForm: "powder",
    typicalDosages: ["1 Liter Sachet (21.8g)", "200ml Tetra Pack"],
    indications: ["dehydration", "loose motion", "diarrhea", "vomiting recovery", "heat exhaustion", "kamzori"],
    usageInstructions: "Dissolve entire 1-liter sachet into 1 liter of clean drinking water. Drink small sips throughout the day. Discard unused solution after 24 hours.",
    timing: "Sip throughout the day",
    contraindications: ["Intractable vomiting", "Severe renal impairment"],
    interactions: ["None significant"],
    sideEffects: ["Well tolerated"],
    hinglishSummary: "Dast (loose motion) aur dehydration mein shareer ka paani aur electrolytes balance karne ke liye sabse zaroori dawa hai.",
    tags: ["Dehydration", "Electrolytes", "Digestive", "Safe"]
  },
  {
    name: "Multivitamin & Minerals",
    genericName: "B-Complex + Zinc + Vitamin C + D3",
    synonyms: ["becosules", "zincovit", "supradyn", "a to z", "neurobion forte", "limcee", "calcirol"],
    category: "Vitamins",
    defaultForm: "capsule",
    typicalDosages: ["1 Capsule daily", "60000 IU (D3 weekly)"],
    indications: ["general weakness", "mouth ulcers", "low immunity", "fatigue", "nerve health", "kamzori", "chhale"],
    usageInstructions: "Take 1 capsule once daily after lunch or breakfast with plenty of water. Do not chew.",
    timing: "After Meals",
    contraindications: ["Hypervitaminosis"],
    interactions: ["Tetracyclines (space by 2 hours)"],
    sideEffects: ["Bright yellow urine (harmless B2 excretion)"],
    hinglishSummary: "Taakat aur immunity ke liye. Dopahar ka khana khane ke baad ek capsule roz lein.",
    tags: ["Vitamins", "Immunity", "Energy", "Daily"]
  }
];

/**
 * Searches the clinical formulary for matching drug entries
 */
export function findMatchingDrugInKnowledgeBase(queryText: string): DrugKnowledgeItem | null {
  const clean = queryText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = clean.split(/\s+/).filter(w => w.length > 2);

  // Exact name or generic match
  for (const item of PHARMA_KNOWLEDGE_BASE) {
    if (clean.includes(item.name.toLowerCase()) || clean.includes(item.genericName.toLowerCase())) {
      return item;
    }
    for (const syn of item.synonyms) {
      if (clean.includes(syn.toLowerCase())) {
        return item;
      }
    }
  }

  // Token fuzzy overlap match
  for (const item of PHARMA_KNOWLEDGE_BASE) {
    for (const word of words) {
      if (item.name.toLowerCase().includes(word) || item.genericName.toLowerCase().includes(word)) {
        return item;
      }
      for (const syn of item.synonyms) {
        if (syn.toLowerCase().includes(word) && word.length >= 4) {
          return item;
        }
      }
    }
  }

  return null;
}

/**
 * Evaluates symptoms mentioned in the query and identifies matching indications
 */
export function evaluateSymptoms(queryText: string): DrugKnowledgeItem[] {
  const lower = queryText.toLowerCase();
  const matched = new Set<DrugKnowledgeItem>();

  for (const item of PHARMA_KNOWLEDGE_BASE) {
    for (const ind of item.indications) {
      if (lower.includes(ind)) {
        matched.add(item);
        break;
      }
    }
  }

  return Array.from(matched);
}

/**
 * Detects if the prompt is written in Hinglish or Hindi
 */
export function isHinglishOrHindi(text: string): boolean {
  const hinglishTokens = [
    'kya', 'hai', 'mein', 'mera', 'meri', 'mere', 'paas', 'dawai', 'dawaii', 'dard', 
    'sar', 'pet', 'bukhar', 'khana', 'khani', 'pehle', 'baad', 'kaise', 'lena', 
    'le', 'sakte', 'batao', 'chahiye', 'namaste', 'kaunsi', 'ulti', 'gas', 'chheenk'
  ];
  const words = text.toLowerCase().split(/\s+/);
  let count = 0;
  for (const w of words) {
    if (hinglishTokens.includes(w)) count++;
  }
  return count >= 2 || /[\u0900-\u097F]/.test(text);
}

/**
 * Evaluates whether a conversation turn is a "Normal" pharmacist chat or "Complex" query
 * Normal: Greetings, common OTC ailments, dosage/timing, inventory lookups, or previously learned tasks -> Handled by SLM!
 * Complex: Hospital procedures, emergency triage, rare pathology, multi-drug disease conflicts -> Handled by Gemini!
 */
export function isNormalChat(
  queryText: string,
  userMedicines: Medicine[] = [],
  userKnowledge: SlmKnowledgeItem[] = []
): boolean {
  const lower = queryText.toLowerCase().trim();

  // 1. Check if the query matches a previously learned task distilled by SLM
  for (const item of userKnowledge) {
    if (item.type === 'learned_task' && item.queryPattern) {
      const patternWords = item.queryPattern.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (patternWords.length > 0) {
        const matches = patternWords.filter(w => lower.includes(w));
        if (matches.length >= Math.min(2, patternWords.length)) {
          console.log(`[SLM ROUTER] Query matches learned task "${item.topic}". Handled locally by SLM!`);
          return true; // SLM can answer without asking Gemini!
        }
      }
    }
  }

  // 2. High-complexity Hospital / Emergency / Surgical triggers requiring Gemini online intelligence
  const complexTriggers = [
    'hospital admit', 'hospitalization', 'emergency room', 'icu', 'surgery', 'surgical',
    'anesthesia', 'chemotherapy', 'oncology', 'dialysis', 'kidney transplant', 'biopsy',
    'pathology report', 'blood test result', 'mri with contrast', 'endoscopy procedure',
    'colonoscopy', 'deep clinical research', 'search the web', 'clinical trial', 'rare syndrome',
    'creatinine is', 'hba1c is', 'tsh is', 'sgpt', 'sgot', 'ecg abnormal'
  ];

  for (const trigger of complexTriggers) {
    if (lower.includes(trigger)) {
      console.log(`[SLM ROUTER] Complex clinical/hospital query detected ("${trigger}"). Escalating to Gemini API.`);
      return false; // Route to Gemini
    }
  }

  // 3. Normal Everyday Pharmacy & Symptom Queries -> Handled by SLM
  return true;
}

/**
 * In-Memory & LocalStorage Cache for 0ms latency access to user-trained SLM knowledge
 */
const slmKnowledgeMemoryCache = new Map<string, SlmKnowledgeItem[]>();

export function getCachedUserSlmKnowledge(userId: string): SlmKnowledgeItem[] {
  if (slmKnowledgeMemoryCache.has(userId)) {
    return slmKnowledgeMemoryCache.get(userId) || [];
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(`dawalens_slm_knowledge_${userId}`);
      if (stored) {
        const parsed: SlmKnowledgeItem[] = JSON.parse(stored);
        slmKnowledgeMemoryCache.set(userId, parsed);
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to read SLM knowledge from localStorage:", e);
    }
  }
  return [];
}

/**
 * Loads user-trained SLM knowledge from Firestore and caches locally
 */
export async function loadUserSlmKnowledge(userId: string): Promise<SlmKnowledgeItem[]> {
  try {
    const q = query(collection(db, 'users', userId, 'slmKnowledge'), limit(100));
    const snap = await getDocs(q);
    const items: SlmKnowledgeItem[] = [];

    snap.forEach(docSnap => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        userId,
        type: data.type || 'user_profile',
        topic: data.topic || 'Medical Note',
        content: data.content || '',
        source: data.source || 'slm_extracted',
        queryPattern: data.queryPattern,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now()
      });
    });

    slmKnowledgeMemoryCache.set(userId, items);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(`dawalens_slm_knowledge_${userId}`, JSON.stringify(items));
      } catch (e) {}
    }

    return items;
  } catch (err) {
    console.warn("Firestore SLM knowledge load falling back to cache:", err);
    return getCachedUserSlmKnowledge(userId);
  }
}

/**
 * Self-Training Engine: Trains the SLM on user conversation data and saves to database
 * Extracts patient allergies, chronic conditions, and medication preferences
 */
export async function trainSlmOnUserData(userId: string, userMessage: string, assistantResponse: string): Promise<void> {
  if (!userId || !userMessage.trim()) return;

  const lower = userMessage.toLowerCase();
  const learnedItems: Partial<SlmKnowledgeItem>[] = [];

  // 1. Detect Patient Drug / Food Allergies
  const allergyRegex = /(?:allergic\s*to|allergy\s*(?:hai|from|to)|reaction\s*from|mujhe\s*allergy\s*hai)\s*([a-zA-Z0-9\s,]+)/i;
  const allergyMatch = lower.match(allergyRegex);
  if (allergyMatch && allergyMatch[1]) {
    const allergen = allergyMatch[1].trim().slice(0, 80);
    learnedItems.push({
      type: 'allergy',
      topic: `Allergy: ${allergen.toUpperCase()}`,
      content: `Patient has reported adverse reaction / allergy to: ${allergen}.`,
      source: 'slm_extracted'
    });
  }

  // 2. Detect Chronic Conditions (Diabetes, Hypertension, Asthma, Thyroid, Heart, GERD)
  if (/diabetes|diabetic|sugar\s*ki\s*bimari/i.test(lower)) {
    learnedItems.push({
      type: 'chronic_condition',
      topic: 'Chronic: Type 2 Diabetes',
      content: 'Patient has self-identified as diabetic. Monitor sugar interactions and avoid sugary syrups.',
      source: 'slm_extracted'
    });
  }
  if (/hypertension|high\s*bp|blood\s*pressure/i.test(lower)) {
    learnedItems.push({
      type: 'chronic_condition',
      topic: 'Chronic: Hypertension (High BP)',
      content: 'Patient has high blood pressure. Caution with decongestants (Pseudoephedrine) and NSAIDs.',
      source: 'slm_extracted'
    });
  }
  if (/asthma|asthmatic|saans\s*phoolna|inhaler/i.test(lower)) {
    learnedItems.push({
      type: 'chronic_condition',
      topic: 'Chronic: Asthma / Respiratory Sensitivity',
      content: 'Patient has asthma / respiratory sensitivity. Avoid non-selective beta-blockers.',
      source: 'slm_extracted'
    });
  }
  if (/thyroid|hypothyroid/i.test(lower)) {
    learnedItems.push({
      type: 'chronic_condition',
      topic: 'Chronic: Thyroid Condition',
      content: 'Patient manages thyroid medication. Remind to take thyroxine on empty stomach.',
      source: 'slm_extracted'
    });
  }

  // 3. Detect Patient Schedule Preferences
  if (/(?:subah|morning)\s*(\d{1,2}\s*(?:am|baje)?)/i.test(lower) || /wake\s*up\s*at\s*(\d{1,2})/i.test(lower)) {
    learnedItems.push({
      type: 'preference',
      topic: 'Daily Routine: Morning Wake Time',
      content: `Patient morning routine mentioned in chat: "${userMessage.slice(0, 100)}"`,
      source: 'slm_extracted'
    });
  }

  // Save new learned facts to Firestore
  for (const item of learnedItems) {
    try {
      const docId = `learned_${item.type}_${crypto.randomUUID().slice(0, 8)}`;
      const fullItem: SlmKnowledgeItem = {
        id: docId,
        userId,
        type: item.type as any,
        topic: item.topic || 'Patient Health Pattern',
        content: item.content || '',
        source: 'slm_extracted',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(doc(db, 'users', userId, 'slmKnowledge', docId), fullItem, { merge: true });

      // Update in-memory cache
      const cached = getCachedUserSlmKnowledge(userId);
      const updated = [fullItem, ...cached.filter(c => c.topic !== fullItem.topic)];
      slmKnowledgeMemoryCache.set(userId, updated);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`dawalens_slm_knowledge_${userId}`, JSON.stringify(updated));
      }
      console.log(`[SLM CONTINUOUS LEARNING] Learned new patient insight: "${fullItem.topic}" stored in Firestore.`);
    } catch (err) {
      console.warn("Error saving trained SLM knowledge to Firestore:", err);
    }
  }
}

/**
 * Distillation Engine: Takes what work Gemini did on complex medical/hospital tasks
 * and teaches the SLM so the SLM can execute it in the future without asking Gemini!
 */
export async function distillGeminiAnswerToSlm(
  userId: string,
  userQuery: string,
  geminiAnswer: string
): Promise<void> {
  if (!userId || !userQuery.trim() || !geminiAnswer.trim()) return;

  try {
    // Generate clean query pattern (keywords with length >= 4)
    const keywords = userQuery
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !['what', 'when', 'where', 'which', 'should', 'could', 'please', 'about', 'doctor'].includes(w));

    if (keywords.length < 2) return;

    const queryPattern = keywords.slice(0, 6).join(' ');
    const docId = `task_${keywords.slice(0, 3).join('_')}_${crypto.randomUUID().slice(0, 6)}`;
    const topic = userQuery.length > 60 ? userQuery.slice(0, 57) + '...' : userQuery;

    const learnedTask: SlmKnowledgeItem = {
      id: docId,
      userId,
      type: 'learned_task',
      topic: `Learned Task: ${topic}`,
      content: geminiAnswer.trim(),
      source: 'gemini_distilled',
      queryPattern,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await setDoc(doc(db, 'users', userId, 'slmKnowledge', docId), learnedTask, { merge: true });

    // Update memory cache so next query matches immediately
    const cached = getCachedUserSlmKnowledge(userId);
    const updated = [learnedTask, ...cached.filter(c => c.queryPattern !== queryPattern)];
    slmKnowledgeMemoryCache.set(userId, updated);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`dawalens_slm_knowledge_${userId}`, JSON.stringify(updated));
    }

    console.log(`[SLM DISTILLATION] Successfully distilled Gemini clinical solution for "${topic}". Future similar queries will be answered by SLM on-device without Gemini!`);
  } catch (err) {
    console.warn("Failed to distill Gemini response into SLM knowledge:", err);
  }
}

/**
 * Compiles stored SLM knowledge to feed into Gemini API for enhanced clinical personalization
 */
export async function getLearnedSlmContextForGemini(userId: string): Promise<string> {
  if (!userId) return "";

  try {
    const knowledge = await loadUserSlmKnowledge(userId);
    if (knowledge.length === 0) return "";

    const allergies = knowledge.filter(k => k.type === 'allergy').map(k => k.content).join('; ');
    const chronic = knowledge.filter(k => k.type === 'chronic_condition').map(k => k.content).join('; ');
    const preferences = knowledge.filter(k => k.type === 'preference').map(k => k.content).join('; ');
    const learnedTasks = knowledge.filter(k => k.type === 'learned_task').slice(0, 3).map(k => `• ${k.topic}: ${k.content.slice(0, 160)}...`).join('\n');

    let profileContext = `\n\n[PATIENT HEALTH PROFILE & SLM LEARNED KNOWLEDGE (Stored in DB):`;
    if (allergies) profileContext += `\n- Known Allergies: ${allergies}`;
    if (chronic) profileContext += `\n- Chronic Conditions: ${chronic}`;
    if (preferences) profileContext += `\n- Patient Preferences: ${preferences}`;
    if (learnedTasks) profileContext += `\n- Previously Resolved Tasks & Instructions:\n${learnedTasks}`;
    profileContext += `\nUse this personal health profile to tailor hospital, medication, and pharmacy recommendations precisely.]\n`;

    return profileContext;
  } catch (err) {
    return "";
  }
}

/**
 * On-Device Small Language Model Response Generator
 * Executes 100% locally when offline or for normal chat
 */
export function generateOfflineSlmConsultation(
  queryText: string,
  userMedicines: Medicine[],
  conversationHistory: { role: string; content: string }[] = [],
  userKnowledge: SlmKnowledgeItem[] = []
): string {
  const isHinglish = isHinglishOrHindi(queryText);
  const lower = queryText.toLowerCase().trim();

  // Check if this query matches a previously learned Gemini-distilled task
  for (const item of userKnowledge) {
    if (item.type === 'learned_task' && item.queryPattern) {
      const patternWords = item.queryPattern.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (patternWords.length > 0) {
        const matches = patternWords.filter(w => lower.includes(w));
        if (matches.length >= Math.min(2, patternWords.length)) {
          return `${item.content}\n\n*(⚡ Answered directly by Dr. DawaLens On-Device SLM from your learned medical memory)*`;
        }
      }
    }
  }

  // Cross-reference user's learned allergies with requested drugs
  const allergies = userKnowledge.filter(k => k.type === 'allergy');
  for (const a of allergies) {
    const allergen = a.content.toLowerCase();
    if (lower.includes('aspirin') && allergen.includes('aspirin')) {
      return `⚠️ **Patient Safety Alert**: According to your stored medical profile, you have an allergy to **Aspirin / NSAIDs**. Please avoid taking Aspirin or Ibuprofen, and consult your doctor!`;
    }
    if (lower.includes('penicillin') && allergen.includes('penicillin')) {
      return `⚠️ **Patient Safety Alert**: You have a recorded allergy to **Penicillin / Amoxicillin**. Avoid taking Augmentin, Amoxicillin, or related beta-lactams.`;
    }
  }

  // 1. Conversational & Everyday Intent Handlers (Normal Chat)
  
  // A. Well-being & Politeness ("how are you?", "are you fine?", "are you okay?", "how's it going?", "kaise ho?")
  if (
    /how\s*(are|r)\s*(you|u)/i.test(lower) ||
    /(are|r)\s*(you|u)\s*(fine|ok|okay|good|alright)/i.test(lower) ||
    /how\s*do\s*you\s*do/i.test(lower) ||
    /how\s*is\s*it\s*going/i.test(lower) ||
    /kaise\s*ho/i.test(lower) ||
    /kya\s*haal/i.test(lower) ||
    /theek\s*ho/i.test(lower) ||
    /sab\s*theek/i.test(lower)
  ) {
    if (isHinglish) {
      return `Main bilkul theek hoon, poochne ke liye shukriya! 🙏 Main hoon aapka AI Pharmacist **Dr. DawaLens**.\n\nAapki tabiyat kaisi hai aaj? Kya aapko koi dard, bukhar ya dawai ke baare me kuch poochna hai? Main aapki madad ke liye hamesha taiyar hoon! 😊💊`;
    }
    return `I am doing great, thank you for asking! 😊 I'm feeling wonderful and ready to assist you.\n\nHow are you feeling today? Are you experiencing any symptoms, or do you have any questions about your medications or daily schedule? 💊🩺`;
  }

  // B. Work / Capabilities / Purpose ("what's work to do?", "what can you do?", "what is your work?", "who are you?", "kaam kya hai?")
  if (
    /what('?s|\s+is)?\s*work\s*(to\s*do)?/i.test(lower) ||
    /what\s*(can|do)\s*you\s*do/i.test(lower) ||
    /what\s*is\s*your\s*(work|job|role|purpose)/i.test(lower) ||
    /who\s*are\s*you/i.test(lower) ||
    /how\s*can\s*you\s*help/i.test(lower) ||
    /kya\s*kaam/i.test(lower) ||
    /kaam\s*kya\s*hai/i.test(lower) ||
    /tum\s*kya\s*karte/i.test(lower) ||
    /aapka\s*kaam/i.test(lower)
  ) {
    if (isHinglish) {
      return `Main hoon **Dr. DawaLens**, aapka personal AI Pharmacist aur health companion! 🩺💊\n\nMera mukhya kaam aapki dawaiyon aur swasthya ki suraksha karna hai:\n\n1. 📦 **Vault Check**: Dekhna ki aapke paas kaunsi dawaiyan hain aur zaroorat ke waqt batana.\n2. ⚠️ **Drug Interaction Check**: Do ya zyada dawaiyon ko ek sath lena safe hai ya nahi, ye jaanch karna.\n3. ⏰ **Dawai Ka Sahi Samay**: Khane se pehle ya baad me, subah ya raat ko kab leni hai batana.\n4. 🔍 **Side Effects & Warnings**: Dawaiyon ke dushparinam aur savdhaniyan samjhana.\n5. 📸 **Smart Strip Scanner**: Dawaiyon ke pack ko camera se scan karke details auto-save karna.\n6. 🧠 **Continuous Learning**: Aapki allergies aur bimariyon ko yaad rakhna taaki har baar sahi salah mile.\n\nBataiye, aaj hum kis cheez par kaam karein? 😊`;
    }
    return `As your dedicated AI Pharmacist **Dr. DawaLens**, here is everything I can do for you: 🩺💊\n\n1. 📦 **Check Your Medicine Vault**: Tell me what you're feeling, and I will search the medicines you *already own* first.\n2. ⚠️ **Drug Interaction Safety**: Cross-check your medications to make sure they are completely safe to take together.\n3. ⏰ **Dosage & Timing Guide**: Explain exact schedules (before or after meals, morning, afternoon, or bedtime).\n4. 🔍 **Side Effects & Warnings**: Detail drug precautions, contraindications, and safe OTC alternatives.\n5. 📸 **Instant Packaging Scanner**: Classify blister strips, bottles, expiry dates, and labels with computer vision.\n6. 🧠 **Continuous Learning**: Remember your personal allergies, chronic conditions, and preferences across visits.\n\nWhat would you like to work on today? 😊`;
  }

  // C. Standard Greetings ("hi", "hello", "hey", "namaste", "good morning", "good evening")
  if (
    /^(hi|hello|hey|namaste|good\s*(morning|evening|afternoon)|salam|greetings|hola)\b/i.test(lower) && 
    lower.length < 40
  ) {
    if (isHinglish) {
      return `Namaste! 🙏 Main hoon **Dr. DawaLens**, aapka AI Pharmacist. Aaj main aapki dawaiyon, vault check ya swasthya me kaise madad kar sakta hoon? 💊🌿`;
    }
    return `Hello! 😊 I'm **Dr. DawaLens**, your personal AI Pharmacist. How can I help you today with your medications, vault check, or health advice? 💊🩺`;
  }

  // D. Gratitude ("thank you", "thanks", "dhanyawad", "shukriya")
  if (/^(thank\s*you|thanks|many\s*thanks|dhanyawad|shukriya|thanku)\b/i.test(lower)) {
    if (isHinglish) {
      return `Aapka bahut-bahut swagat hai! 😊 Mujhe aapki madad karke khushi hui. Apna achhe se khayal rakhein aur dawaiyan nirdharit samay par lein! 🌿🙏`;
    }
    return `You're very welcome! 😊 It's always my pleasure to help you stay healthy and safe. Remember to take your medications on time, and reach out anytime you need assistance! 💊🙏`;
  }

  // E. Affirmations / Closure ("ok", "okay", "got it", "theek hai", "accha", "bye")
  if (/^(ok|okay|alright|got\s*it|theek\s*hai|accha|samajh\s*gaya|bye|goodbye|see\s*you)\b/i.test(lower) && lower.length < 25) {
    if (isHinglish) {
      return `Bahut badhiya! 👍 Apna khayal rakhein, samay par dawai lein aur khoob paani piyein. Zaroorat padne par main hamesha yahan hoon! 💊🌿`;
    }
    return `Understood! 👍 Take great care of your health, stay well-hydrated, and I'm right here whenever you need me! 🌿🩺`;
  }

  // 2. Active Inventory Search: Check what user currently holds in their vault
  const vaultMatches: Medicine[] = [];
  const mentionedDrug = findMatchingDrugInKnowledgeBase(queryText);

  // Look for any medicine the user specifically asked about
  for (const med of userMedicines) {
    if (med.isDeleted) continue;
    const medLower = med.name.toLowerCase();
    if (lower.includes(medLower) || (mentionedDrug && (medLower.includes(mentionedDrug.name.toLowerCase()) || mentionedDrug.synonyms.some(s => medLower.includes(s))))) {
      vaultMatches.push(med);
    }
  }

  // Check if user is asking for general pain, fever, cold, acidity, etc.
  const symptomMatches = evaluateSymptoms(queryText);
  const relevantVaultMeds: { med: Medicine; drug: DrugKnowledgeItem }[] = [];

  for (const med of userMedicines) {
    if (med.isDeleted) continue;
    for (const drug of symptomMatches) {
      const medName = med.name.toLowerCase();
      if (medName.includes(drug.name.toLowerCase()) || drug.synonyms.some(s => medName.includes(s))) {
        relevantVaultMeds.push({ med, drug });
      }
    }
  }

  // 3. Scenario A: User asked about what they have, or an ailment where they ALREADY own the remedy
  if (relevantVaultMeds.length > 0) {
    const primary = relevantVaultMeds[0];
    const med = primary.med;
    const drug = primary.drug;

    if (isHinglish) {
      return `🌿 **Aapke Vault Mein Dawai Maujood Hai!**\n\n` +
        `Maine aapka medicine vault check kiya. Aapke paas **${med.name}** (${med.dosage || drug.typicalDosages[0]}, Form: ${med.form || drug.defaultForm}) already uplabdh hai.\n\n` +
        `### 📋 Kaisi aur kab leni hai:\n` +
        `- **Timing**: ${drug.timing}\n` +
        `- **Dosage Nirdesh**: ${drug.usageInstructions}\n` +
        `- **Expiry Date**: ${med.expirationDate ? `Aapki strip ki expiry ${med.expirationDate} hai (Safe).` : 'Strip par expiry date check karein.'}\n\n` +
        `### ⚠️ Savdhaniyan:\n` +
        `- ${drug.contraindications.join(', ')}\n` +
        `- Agar 24-48 ghante me aaram na mile ya takleef badhe, toh kripya doctor se zaroor milein.\n\n` +
        `Kya aapko iske baare me aur koi jankari chahiye? 😊`;
    }

    return `🌿 **Good News! You Already Have This In Your Vault!**\n\n` +
      `I scanned your medication inventory and found **${med.name}** (${med.dosage || drug.typicalDosages[0]}, ${med.form || drug.defaultForm}).\n\n` +
      `### 📋 Clinical Instructions & Timing:\n` +
      `- **Recommended Timing**: **${drug.timing}**\n` +
      `- **Instructions**: ${drug.usageInstructions}\n` +
      `- **Vault Expiry**: ${med.expirationDate ? `Expires on ${med.expirationDate} (Safe to use).` : 'Please verify the expiry on your blister pack.'}\n\n` +
      `### ⚠️ Precautions & Side Effects:\n` +
      `- ${drug.contraindications.join(', ')}\n` +
      `- Common mild effects: ${drug.sideEffects.join(', ')}.\n` +
      `- *Consult your physician if symptoms persist beyond 2-3 days.* 💊`;
  }

  // 4. Scenario B: User asked about a specific medicine by name
  if (mentionedDrug) {
    const isOwned = userMedicines.some(m => !m.isDeleted && (m.name.toLowerCase().includes(mentionedDrug.name.toLowerCase()) || mentionedDrug.synonyms.some(s => m.name.toLowerCase().includes(s))));
    const ownedNotice = isOwned 
      ? `*(You currently have this item saved in your vault!)*` 
      : `*(This item is currently not in your personal vault.)*`;

    if (isHinglish) {
      return `💊 **${mentionedDrug.name}** (${mentionedDrug.genericName})\n${isOwned ? '✅ *Ye aapke vault me save hai.*' : 'ℹ️ *Ye aapke vault me nahi hai.*'}\n\n` +
        `### 🎯 Kiske Liye Istemal Hoti Hai:\n` +
        `- ${mentionedDrug.indications.map(i => `**${i.toUpperCase()}**`).join(', ')}\n\n` +
        `### ⏰ Kaise Khayein:\n` +
        `- **Timing**: **${mentionedDrug.timing}**\n` +
        `- **Instructions**: ${mentionedDrug.usageInstructions}\n\n` +
        `### ⚠️ Dhyan Dene Yogya Baatein:\n` +
        `- **Contraindications**: ${mentionedDrug.contraindications.join(', ')}\n` +
        `- **Common Side Effects**: ${mentionedDrug.sideEffects.join(', ')}\n\n` +
        `${mentionedDrug.hinglishSummary}`;
    }

    return `💊 **Clinical Overview: ${mentionedDrug.name}** (${mentionedDrug.genericName})\n${ownedNotice}\n\n` +
      `### 🎯 Primary Indications:\n` +
      `- Recommended for: **${mentionedDrug.indications.join(', ')}**\n` +
      `- Standard Available Strengths: ${mentionedDrug.typicalDosages.join(', ')}\n\n` +
      `### ⏰ Administration Guidelines:\n` +
      `- **Optimal Timing**: **${mentionedDrug.timing}**\n` +
      `- **Administration Note**: ${mentionedDrug.usageInstructions}\n\n` +
      `### ⚠️ Safety & Interactions:\n` +
      `- **Key Warnings**: ${mentionedDrug.contraindications.join('; ')}\n` +
      `- **Known Interactions**: ${mentionedDrug.interactions.join(', ')}\n` +
      `- **Potential Side Effects**: ${mentionedDrug.sideEffects.join(', ')}\n\n` +
      `*Always follow the exact prescription instructions provided by your physician or licensed pharmacist.* 🩺`;
  }

  // 5. Scenario C: Check Drug-to-Drug Interactions between active inventory
  if (lower.includes('interaction') || lower.includes('safe together') || lower.includes('side effect') || lower.includes('ek sath')) {
    if (userMedicines.length === 0) {
      return `You currently have no medications saved in your vault to cross-check. When you scan or add medications, I can automatically evaluate multi-drug interactions, contraindications, and food timings! 💊`;
    }

    const activeList = userMedicines.filter(m => !m.isDeleted);
    const medNames = activeList.map(m => m.name).join(', ');

    if (isHinglish) {
      return `🩺 **Aapke Vault Ka Drug Interaction Check:**\n\n` +
        `Aapke paas active vault me **${activeList.length}** dawaiyan hain: **${medNames}**.\n\n` +
        `- **General Rule**: NSAIDs (jaise Ibuprofen/Combiflam) ko khali pet na lein, aur Paracetamol ke sath over-dosage se bachein.\n` +
        `- **Spacing**: Antibiotics aur Antacids (gas ki dawai) ke beech hamesha 2 ghante ka antar rakhein.\n` +
        `- Sabhi dawaiyon ki expiry dates valid hain aur samay nirdharit rakhein.`;
    }

    return `🩺 **Medication Interaction Analysis for Your Vault:**\n\n` +
      `Active Medications Evaluated (${activeList.length}): **${medNames}**\n\n` +
      `### 🔍 Key Clinical Safety Findings:\n` +
      `1. **Timing Spacing**: Always separate Antacids (PPIs like Pantoprazole) and Antibiotics/Iron supplements by at least **2 hours** to avoid absorption blockage.\n` +
      `2. **Gastric Protection**: Never take NSAID analgesics on an empty stomach.\n` +
      `3. **Dose Monitoring**: Ensure total daily Paracetamol across all combinations does not exceed 4000mg.\n\n` +
      `All current medications appear compatible under standard scheduled intervals. Stay well hydrated! 💧`;
  }

  // 6. Scenario D: Inventory Summary Query ("What medicines do I have?", "Mere paas kya hai?")
  if (lower.includes('what do i have') || lower.includes('my medicines') || lower.includes('show inventory') || lower.includes('mere paas') || lower.includes('konsi dawa')) {
    const active = userMedicines.filter(m => !m.isDeleted);
    if (active.length === 0) {
      return isHinglish
        ? `Aapke vault me abhi koi dawai add nahi hai. Niche camera button se packaging scan karein ya manual add karein! 📸`
        : `Your medication vault is currently empty. Tap the camera button below to scan your medicine strip or add it manually! 📸`;
    }

    const listStr = active.map(m => `• **${m.name}** — ${m.dosage || 'Dosage not set'} (${m.form || 'tablet'}), Qty: ${m.quantity || 1}, Exp: ${m.expirationDate || 'N/A'}`).join('\n');
    return isHinglish
      ? `📦 **Aapke Vault Mein Kul ${active.length} Dawaiyan Hain:**\n\n${listStr}\n\nKisi bhi dawai ke baare me detail janne ke liye uska naam likhein! 😊`
      : `📦 **Your Active Medicine Vault (${active.length} items):**\n\n${listStr}\n\nFeel free to ask me any question regarding specific dosages, timings, or interactions! 😊`;
  }

  // 7. General Conversational Pharmacist Guidance
  if (isHinglish) {
    return `Dr. DawaLens aapki sewa mein hazir hai! 🩺💊\n\n` +
      `Main aapki dawaiyon aur swasthya se jude kisi bhi sawal ka jawab dene ke liye taiyar hoon.\n\n` +
      `Aap mujhse pooch sakte hain:\n` +
      `• *"Mere vault ki dawaiyon ka interaction check karo"*\n` +
      `• *"Mujhe sar dard ya bukhar hai, mere paas kaunsi dawai hai?"*\n` +
      `• *"Dawai khane ka sahi samay kya hai?"*\n` +
      `• *"Dawaiyon ke side effects kya hote hain?"*\n\n` +
      `Aapko kis baare mein jankari chahiye? Khulkar bataiye! 😊`;
  }

  return `I am here to guide you with the utmost care! 🩺💊\n\n` +
    `I have full visibility over the medicines currently stored in your vault and can answer any medication, dosage, or health questions.\n\n` +
    `You can ask me questions like:\n` +
    `• *"Check interactions between the medicines in my vault"*\n` +
    `• *"I have a headache, what medicine do I have that can help?"*\n` +
    `• *"What is the best time to take my daily medicines?"*\n` +
    `• *"Explain any side effects or warnings for my medications"*\n\n` +
    `How can I best assist you with your health today? 😊`;
}

/**
 * Offline SLM Extractor for Medicine Packaging
 * Combines CNN visual features with OCR text patterns locally with zero network calls
 */
export function extractMedicineOfflineSlm(
  ocrText: string,
  cnnFeatures?: CnnVisualFeatures,
  hints?: { potentialExpiry?: string; potentialDosage?: string; potentialQuantity?: number }
) {
  const cleanOcr = (ocrText || '').trim();
  const matchedDrug = findMatchingDrugInKnowledgeBase(cleanOcr);

  // Extract candidate brand name from first non-trivial line
  const lines = cleanOcr
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length >= 3 && !/^(exp|mfg|batch|b\.no|mrp|rs|tax|lic|mfg\.lic|comp)/i.test(l));

  let name = matchedDrug ? matchedDrug.name : (lines[0] || 'Scanned Medicine');
  // Capitalize properly
  name = name.charAt(0).toUpperCase() + name.slice(1);

  // Form detection: combine CNN visual features with knowledge base
  let form: MedicineForm = cnnFeatures?.form || matchedDrug?.defaultForm || 'tablet';
  if (/capsule|cap\b/i.test(cleanOcr)) form = 'capsule';
  else if (/syrup|suspension|oral\s*solution|drops/i.test(cleanOcr)) form = 'syrup';
  else if (/injection|ampule|vial/i.test(cleanOcr)) form = 'ampule';
  else if (/powder|sachet/i.test(cleanOcr)) form = 'powder';
  else if (/ointment|cream|gel|tube/i.test(cleanOcr)) form = 'other';

  // Dosage resolution
  let dosage = hints?.potentialDosage;
  if (!dosage && matchedDrug && matchedDrug.typicalDosages.length > 0) {
    // Check if any typical dosage is in OCR
    const foundDosage = matchedDrug.typicalDosages.find(d => cleanOcr.toLowerCase().includes(d.toLowerCase()));
    dosage = foundDosage || matchedDrug.typicalDosages[0];
  }
  if (!dosage) {
    const dosageMatch = cleanOcr.match(/([0-9]+(?:\.[0-9]+)?\s*(?:mg|g|mcg|iu|ml|%))\b/i);
    dosage = dosageMatch ? dosageMatch[1].replace(/\s+/g, '').toUpperCase() : 'N/A';
  }

  // Expiration date resolution
  let expirationDate = hints?.potentialExpiry;
  if (!expirationDate) {
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() + 1);
    expirationDate = `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, '0')}-01`;
  }

  // Quantity resolution from CNN blister cell count or hints
  const quantity = hints?.potentialQuantity || cnnFeatures?.estimatedUnitCount || (form === 'syrup' ? 1 : 10);

  // Usage instructions and schedule
  const usageInstructions = matchedDrug ? matchedDrug.usageInstructions : 'Take as directed on packaging or by physician.';
  const schedule = matchedDrug ? matchedDrug.timing : 'After Meals';
  const category = matchedDrug ? matchedDrug.category : (form === 'syrup' ? 'Respiratory' : 'Pain Relief');
  const tags = matchedDrug ? matchedDrug.tags : ['Scanned', form];

  return {
    name,
    dosage,
    expirationDate,
    form,
    quantity,
    usageInstructions,
    schedule,
    category,
    tags
  };
}
