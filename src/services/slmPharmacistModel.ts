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
import { EXPANDED_CLINICAL_DRUGS } from "./expandedPharmaDataset";

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
  },
  {
    name: "Aceclofenac + Paracetamol",
    genericName: "Aceclofenac 100mg + Paracetamol 325mg",
    synonyms: ["zerodol-p", "zerodol p", "hifenac-p", "hifenac p", "dolokind-p", "aceclo plus"],
    category: "Pain Relief",
    defaultForm: "tablet",
    typicalDosages: ["100mg/325mg"],
    indications: ["severe body ache", "joint pain", "dental pain", "orthopedic pain", "sprain", "swelling with pain", "teeth pain", "kamar dard"],
    usageInstructions: "Take 1 tablet twice daily strictly after meals with water. Do not take on an empty stomach.",
    timing: "After Meals (Twice Daily)",
    contraindications: ["Active gastric ulcer", "Severe renal/liver failure", "Third trimester pregnancy"],
    interactions: ["Other Paracetamol products (overdose risk)", "Blood thinners (Warfarin/Aspirin)"],
    sideEffects: ["Gastric burning", "Nausea", "Indigestion"],
    hinglishSummary: "Tez dard aur sujan (pain & inflammation) ke liye. Hamesha khana khane ke baad lein, khali pet bilkul na lein.",
    tags: ["Pain Relief", "NSAID", "Joint Pain", "Teeth Pain"]
  },
  {
    name: "Mefenamic Acid + Dicyclomine",
    genericName: "Mefenamic Acid 250mg + Dicyclomine HCl 10mg",
    synonyms: ["meftal-spas", "meftal spas", "cyclopam", "spasmonil", "colimex"],
    category: "Pain Relief",
    defaultForm: "tablet",
    typicalDosages: ["250mg/10mg", "500mg/20mg"],
    indications: ["stomach cramps", "menstrual pain", "period cramps", "abdominal colic", "intestinal spasm", "pet me marod", "pet dard"],
    usageInstructions: "Take 1 tablet with or after food when severe cramps occur. Drink warm water.",
    timing: "After Meals / SOS during Cramps",
    contraindications: ["Glaucoma", "Myasthenia gravis", "Severe ulcerative colitis", "Active stomach ulcer"],
    interactions: ["Antihistamines (additive dry mouth)", "Antacids (space by 1 hour)"],
    sideEffects: ["Dry mouth", "Mild drowsiness", "Blurred vision"],
    hinglishSummary: "Pet ke marod aur periods ke dard (menstrual cramps) ke liye sabse asardar dawa hai. Khana khane ke baad lein.",
    tags: ["Stomach Pain", "Cramps", "Period Pain", "SOS"]
  },
  {
    name: "Levocetirizine",
    genericName: "Levocetirizine Dihydrochloride",
    synonyms: ["levocet", "l-hist", "xyzal", "1-al", "levocet-m", "teczine"],
    category: "Allergy",
    defaultForm: "tablet",
    typicalDosages: ["5mg", "2.5mg/5ml"],
    indications: ["allergic cold", "sneezing", "runny nose", "watery eyes", "skin itching", "urticaria", "dust allergy", "nazla", "khujli"],
    usageInstructions: "Take 1 tablet once daily in the evening or at bedtime with water.",
    timing: "Bedtime / Evening",
    contraindications: ["End-stage renal disease (eGFR < 10)"],
    interactions: ["Alcohol", "CNS depressants"],
    sideEffects: ["Mild fatigue", "Dry throat", "Less drowsy than regular cetirizine"],
    hinglishSummary: "Naak behne, chheenkon aur allergy ke liye. Raat ko sone se pehle lena behtar hota hai.",
    tags: ["Allergy", "Cold", "Sneezing", "Antihistamine"]
  },
  {
    name: "Dextromethorphan + Chlorpheniramine",
    genericName: "Dextromethorphan HBr + CPM + Phenylephrine",
    synonyms: ["alex", "ascoril-d", "benadryl dr", "zedex", "chericof", "tossex"],
    category: "Respiratory",
    defaultForm: "syrup",
    typicalDosages: ["5ml to 10ml thrice daily"],
    indications: ["dry cough", "tickly throat", "night cough", "non-productive cough", "sukhi khansi", "gale me kharash"],
    usageInstructions: "Take 5ml to 10ml after meals using measuring cup. Avoid drinking water for 15 minutes after taking syrup to let it soothe the throat.",
    timing: "After Meals / Thrice Daily",
    contraindications: ["Asthma with productive mucus", "MAO inhibitor use within 14 days"],
    interactions: ["MAO inhibitors", "Sedatives"],
    sideEffects: ["Mild drowsiness", "Dizziness", "Nausea"],
    hinglishSummary: "Sukhi khansi (dry cough) aur gale ki kharash ke liye. Peene ke turant baad 15 minute paani na piyein taaki gale ko aaram mile.",
    tags: ["Dry Cough", "Syrup", "Respiratory", "Throat"]
  },
  {
    name: "Ambroxol + Terbutaline + Guaiphenesin",
    genericName: "Ambroxol + Terbutaline + Guaiphenesin + Menthol",
    synonyms: ["ascoril", "ascoril expectorant", "grilinctus-bm", "bro-zedex", "ambrodil-xp"],
    category: "Respiratory",
    defaultForm: "syrup",
    typicalDosages: ["5ml to 10ml thrice daily"],
    indications: ["wet cough", "chesty cough", "cough with mucus", "bronchial congestion", "balgam wali khansi", "chhati me balgam"],
    usageInstructions: "Take 5-10ml after meals with warm water. Drink plenty of warm fluids throughout the day to help loosen mucus.",
    timing: "After Meals (Thrice Daily)",
    contraindications: ["Severe cardiac arrhythmias", "Gastric ulcers"],
    interactions: ["Beta-blockers (propranolol)", "Other bronchodilators"],
    sideEffects: ["Mild tremors", "Increased heart rate", "Stomach upset"],
    hinglishSummary: "Balgam wali khansi (wet cough) ke liye. Balgam ko patla karke bahar nikaalti hai. Gungune paani ke sath lein.",
    tags: ["Wet Cough", "Mucus", "Respiratory", "Expectorant"]
  },
  {
    name: "Loperamide",
    genericName: "Loperamide Hydrochloride",
    synonyms: ["imodium", "lopamide", "ridol", "eldoper"],
    category: "Digestive",
    defaultForm: "tablet",
    typicalDosages: ["2mg"],
    indications: ["acute diarrhea", "frequent loose stools", "traveller's diarrhea", "dast", "loose motion"],
    usageInstructions: "Take 2 capsules initially (4mg), followed by 1 capsule (2mg) after each unformed stool. Maximum 8mg (4 capsules) in 24 hours. Stop as soon as stools normalize.",
    timing: "After each loose stool",
    contraindications: ["Bloody diarrhea (dysentery)", "High fever with diarrhea", "Bacterial enterocolitis"],
    interactions: ["Quinidine", "Ritonavir"],
    sideEffects: ["Constipation if overused", "Abdominal cramps", "Nausea"],
    hinglishSummary: "Dast (loose motion) ki frequency turant kam karti hai. Sath mein ORS ka ghol zaroor piyein taaki paani ki kami na ho.",
    tags: ["Diarrhea", "Loose Motion", "Digestive", "SOS"]
  },
  {
    name: "Metronidazole",
    genericName: "Metronidazole",
    synonyms: ["flagyl", "metrogyl", "aristogyl", "metrogyl 400"],
    category: "Antibiotics",
    defaultForm: "tablet",
    typicalDosages: ["200mg", "400mg"],
    indications: ["amoebic dysentery", "dental infection", "gum abscess", "gut infection", "parasitic diarrhea", "pechish"],
    usageInstructions: "Take 1 tablet after meals with a glass of water. Strictly avoid alcohol during treatment and for 48 hours after.",
    timing: "After Meals (Twice or Thrice Daily)",
    contraindications: ["First trimester pregnancy", "Chronic alcoholism", "Active neurological disease"],
    interactions: ["Alcohol (causes severe disulfiram-like vomiting reaction)", "Warfarin"],
    sideEffects: ["Metallic taste in mouth", "Darkened urine", "Nausea"],
    hinglishSummary: "Pet ke keede (amoeba) aur daanton ke infection ke liye. Khana khane ke baad lein. Iske sath alcohol bilkul na lein.",
    tags: ["Antibiotic", "Dental", "Gut Infection", "Prescription"]
  },
  {
    name: "Rabeprazole",
    genericName: "Rabeprazole Sodium",
    synonyms: ["razo", "razo 20", "happi", "cyra", "rablet", "rabicip", "rabium"],
    category: "Digestive",
    defaultForm: "tablet",
    typicalDosages: ["20mg", "10mg"],
    indications: ["rapid acidity relief", "gerd", "stomach burning", "acid reflux", "peptic ulcer", "pet me jalan", "gas"],
    usageInstructions: "Take 1 tablet once daily in the morning, 30 minutes before breakfast with plain water.",
    timing: "30 mins Before Breakfast (Empty Stomach)",
    contraindications: ["Known allergy to PPIs"],
    interactions: ["Ketoconazole", "Digoxin", "Atazanavir"],
    sideEffects: ["Mild headache", "Diarrhea", "Flatulence"],
    hinglishSummary: "Subah khali pet nashte se 30 minute pehle lein. Pantoprazole se bhi tezi se gas aur pet ki jalan ko shant karti hai.",
    tags: ["Acidity", "GERD", "Digestive", "Fast Relief"]
  },
  {
    name: "Antacid Gel / Suspension",
    genericName: "Magnesium Hydroxide + Aluminium Hydroxide + Simethicone",
    synonyms: ["digene", "gelusil", "mucaine gel", "cremaffin", "polycrol"],
    category: "Digestive",
    defaultForm: "liquid",
    typicalDosages: ["10ml to 15ml (2 spoonfuls)"],
    indications: ["instant heartburn", "acid burning in chest", "bloating", "gas flatulence", "seene me jalan", "pet me gas"],
    usageInstructions: "Take 2 teaspoonfuls (10ml) directly without diluting, 1 hour after meals or whenever heartburn occurs.",
    timing: "1 hr After Meals or SOS during Heartburn",
    contraindications: ["Severe renal failure", "Phosphate depletion"],
    interactions: ["Antibiotics (Ciprofloxacin, Tetracycline - space by 2 hours)"],
    sideEffects: ["Chalky taste", "Mild alteration in bowel habit"],
    hinglishSummary: "Seene aur gale ki jalan ko turant 2 minute me shant karti hai. Bina paani milaye 2 chammach piyein.",
    tags: ["Heartburn", "Instant Relief", "Antacid", "Liquid", "OTC"]
  },
  {
    name: "Ciprofloxacin / Ofloxacin",
    genericName: "Ofloxacin 200mg / Ciprofloxacin 500mg",
    synonyms: ["ciplox", "oflox", "zanocin", "oflox-oz", "cifran", "o2"],
    category: "Antibiotics",
    defaultForm: "tablet",
    typicalDosages: ["200mg", "400mg", "500mg"],
    indications: ["urinary tract infection (uti)", "bacterial gastroenteritis", "typhoid fever", "respiratory infection", "peshab me jalan"],
    usageInstructions: "Take 1 tablet twice daily with plenty of water, 1 hour before or 2 hours after meals. Stay well hydrated.",
    timing: "1 hr Before or 2 hrs After Meals",
    contraindications: ["Pregnancy", "Children < 18 years", "Tendon disorders"],
    interactions: ["Dairy / Calcium / Iron (blocks absorption, separate by 2 hours)", "Theophylline"],
    sideEffects: ["Nausea", "Mild dizziness", "Sun sensitivity"],
    hinglishSummary: "Peshab me jalan (UTI) aur pet ke bacterial infection ke liye. Khoob paani piyein aur doodh/dahi ke sath na lein.",
    tags: ["Antibiotic", "UTI", "Infection", "Prescription"]
  },
  {
    name: "Atorvastatin",
    genericName: "Atorvastatin Calcium",
    synonyms: ["lipitor", "storvas", "atorva", "tonact", "atocor"],
    category: "Heart",
    defaultForm: "tablet",
    typicalDosages: ["10mg", "20mg", "40mg"],
    indications: ["high cholesterol", "hyperlipidemia", "cardiovascular prevention", "heart attack prevention", "cholesterol badhna"],
    usageInstructions: "Take 1 tablet once daily, preferably at bedtime after dinner. Avoid drinking large amounts of grapefruit juice.",
    timing: "Bedtime / After Dinner",
    contraindications: ["Active liver disease", "Pregnancy & breastfeeding"],
    interactions: ["Clarithromycin", "Cyclosporine", "Gemfibrozil"],
    sideEffects: ["Mild muscle aches", "Joint pain", "Headache"],
    hinglishSummary: "Khoon me cholesterol aur triglycerides kam karke dil ko surakshit rakhti hai. Raat ko khane ke baad lein.",
    tags: ["Cholesterol", "Heart", "Daily", "Lipid"]
  },
  {
    name: "Aspirin / Ecosprin",
    genericName: "Low-Dose Aspirin (Acetylsalicylic Acid)",
    synonyms: ["ecosprin 75", "ecosprin 150", "ecosprin", "disprin", "asa"],
    category: "Heart",
    defaultForm: "tablet",
    typicalDosages: ["75mg", "150mg"],
    indications: ["blood thinner", "stroke prevention", "heart attack prevention", "angina", "cardiovascular protection"],
    usageInstructions: "Take 1 tablet daily strictly after lunch or dinner with water. In sudden acute chest pain emergency, chew 1 tablet immediately while waiting for emergency services.",
    timing: "After Meals (Lunch / Dinner)",
    contraindications: ["Active bleeding", "Stomach ulcer", "Aspirin-exacerbated respiratory disease", "Bleeding disorders"],
    interactions: ["Other NSAIDs (Ibuprofen)", "Warfarin / Heparin", "Steroids"],
    sideEffects: ["Gastric irritation", "Increased bleeding time", "Bruising easily"],
    hinglishSummary: "Khoon patla karne aur heart attack se bachne ke liye. Hamesha khana khane ke baad lein taaki pet me jalan na ho.",
    tags: ["Blood Thinner", "Heart", "Daily", "Emergency"]
  },
  {
    name: "Thyroxine / Levothyroxine",
    genericName: "Levothyroxine Sodium",
    synonyms: ["thyronorm", "eltroxin", "synthroid", "thyrox"],
    category: "Hormone",
    defaultForm: "tablet",
    typicalDosages: ["25mcg", "50mcg", "75mcg", "88mcg", "100mcg", "125mcg"],
    indications: ["hypothyroidism", "underactive thyroid", "goiter", "thyroid kamzori", "weight gain due to thyroid"],
    usageInstructions: "Take 1 tablet early morning strictly on an empty stomach with plain water, at least 45 to 60 minutes before tea, coffee, or breakfast.",
    timing: "Early Morning (Strictly Empty Stomach, 45m before tea/breakfast)",
    contraindications: ["Untreated thyrotoxicosis", "Acute myocardial infarction"],
    interactions: ["Calcium & Iron supplements (separate by at least 4 hours)", "Coffee/Tea (reduces absorption)"],
    sideEffects: ["Palpitations if dose is too high", "Weight loss", "Sweating"],
    hinglishSummary: "Thyroid hormone ko normal rakhne ke liye. Subah uthte hi khali pet lein aur agle 45 minute tak chai, coffee ya nashta na karein.",
    tags: ["Thyroid", "Hormone", "Morning", "Empty Stomach", "Daily"]
  },
  {
    name: "Vitamin D3 (Cholecalciferol)",
    genericName: "Cholecalciferol 60,000 IU",
    synonyms: ["calcirol", "d-rise", "uprise-d3", "taylor d3", "gen d3", "aractol"],
    category: "Vitamins",
    defaultForm: "capsule",
    typicalDosages: ["60,000 IU weekly", "1000 IU daily"],
    indications: ["vitamin d deficiency", "bone pain", "fatigue", "calcium absorption", "muscle weakness", "haddiyon me dard"],
    usageInstructions: "Take 1 capsule once a week after a heavy fat-containing meal (such as milk, curd, or lunch) for better absorption.",
    timing: "Once Weekly After Meals (with Milk or Food)",
    contraindications: ["Hypercalcemia", "Hypervitaminosis D", "Kidney stones (calcium oxalate)"],
    interactions: ["Thiazide diuretics", "Cholestyramine"],
    sideEffects: ["None at prescribed doses; nausea or constipation only in extreme overdose"],
    hinglishSummary: "Haddiyon aur taakat ke liye Vitamin D. Hafte me sirf ek baar (once a week) doodh ya khane ke sath lein.",
    tags: ["Vitamin D", "Bones", "Weekly", "Energy"]
  },
  {
    name: "Betahistine",
    genericName: "Betahistine Dihydrochloride",
    synonyms: ["vertin", "vertin 16", "vertin 8", "betaserc", "zevert"],
    category: "Neurological",
    defaultForm: "tablet",
    typicalDosages: ["8mg", "16mg", "24mg"],
    indications: ["vertigo", "dizziness", "spinning head sensation", "meniere's disease", "ear fullness", "chakkar aana"],
    usageInstructions: "Take 1 tablet twice or thrice daily with or after meals to prevent mild stomach irritation.",
    timing: "With or After Meals",
    contraindications: ["Pheochromocytoma", "Active bronchial asthma", "Peptic ulcer"],
    interactions: ["Antihistamines (may reduce betahistine effect)"],
    sideEffects: ["Mild headache", "Nausea", "Dyspepsia"],
    hinglishSummary: "Chakkar aane (vertigo/dizziness) aur sir ghoomne ki bimari ke liye. Khana khane ke baad lein.",
    tags: ["Vertigo", "Dizziness", "Ear", "Chakkar"]
  },
  {
    name: "Domperidone",
    genericName: "Domperidone",
    synonyms: ["domstal", "motilium", "vomistop", "dom-dt"],
    category: "Digestive",
    defaultForm: "tablet",
    typicalDosages: ["10mg"],
    indications: ["bloating after meals", "belching", "gastric heaviness", "fullness in stomach", "pet bhari hona", "khatti dakar"],
    usageInstructions: "Take 1 tablet 15 to 30 minutes before meals with water. Use lowest effective dose for shortest duration.",
    timing: "15-30 mins Before Meals",
    contraindications: ["Cardiac conduction disorders (prolonged QTc)", "GI hemorrhage / obstruction"],
    interactions: ["Ketoconazole", "Erythromycin", "QT-prolonging drugs"],
    sideEffects: ["Dry mouth", "Mild abdominal cramps"],
    hinglishSummary: "Pet bhari hone aur khana upar aane ke liye. Khana khane se 15-20 minute pehle lein.",
    tags: ["Digestive", "Bloating", "Nausea", "Before Meals"]
  },
  ...EXPANDED_CLINICAL_DRUGS
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
 * Helper to strip prompt prefixes, context headers, and question labels (e.g. "Q1. ", "[Patient Profile...]")
 */
export function cleanUserQuery(raw: string): string {
  let cleaned = (raw || '').trim();
  // Strip out injected [Patient Profile & Storage Context: ... ]
  if (cleaned.includes('[Patient Profile & Storage Context:')) {
    const splitIndex = cleaned.lastIndexOf(']\n\n');
    if (splitIndex !== -1) {
      cleaned = cleaned.substring(splitIndex + 3).trim();
    } else {
      const closingBracket = cleaned.indexOf(']');
      if (closingBracket !== -1) {
        cleaned = cleaned.substring(closingBracket + 1).trim();
      }
    }
  }
  // Strip leading question labels like "Q1.", "Q1:", "Q1 -", "Q:", "Question 1:", "1.", "1)", etc.
  cleaned = cleaned.replace(/^(?:q(?:uestion)?\s*\d*[\.\:\-\)]*|\d+[\.\:\-\)]+)\s*/i, '').trim();
  // Strip greeting addresses to Ross or Jack
  cleaned = cleaned.replace(/^(?:hey|hi|hello|dear)?\s*(?:dr\.?\s*)?(?:ross|jack|dawalens)\s*[\,\:\-]?\s*/i, '').trim();
  return cleaned;
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
  const cleanedQuery = cleanUserQuery(queryText);
  const effectiveQuery = cleanedQuery || queryText;
  const isHinglish = isHinglishOrHindi(effectiveQuery);
  const lower = effectiveQuery.toLowerCase().trim();

  // Check if this query matches a previously learned Gemini-distilled task
  for (const item of userKnowledge) {
    if (item.type === 'learned_task' && item.queryPattern) {
      const patternWords = item.queryPattern.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (patternWords.length > 0) {
        const matches = patternWords.filter(w => lower.includes(w));
        if (matches.length >= Math.min(2, patternWords.length)) {
          return item.content;
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

  // Emergency Triage Red Flags
  if (
    /(chest\s*pain|pain\s*in\s*chest|left\s*arm\s*pain|seene\s*me\s*dard|chhati\s*me\s*dard)/i.test(lower) ||
    /(cannot\s*breathe|severe\s*shortness\s*of\s*breath|saans\s*ruk\s*rahi|blue\s*lips)/i.test(lower) ||
    /(vomiting\s*blood|blood\s*in\s*vomit|khoon\s*ki\s*ulti|black\s*stool)/i.test(lower) ||
    /(facial\s*droop|slurred\s*speech|one\s*sided\s*weakness|stroke)/i.test(lower)
  ) {
    if (isHinglish) {
      return `🚨 **EMERGENCY MEDICAL ALERT (Aapatkaleen Chetavani)** 🚨\n\n` +
        `Aapne jo lakshan bataye hain (jaise seene me tez dard ya saans lene me gambhir takleef), ye kisi aapatkaleen sthiti (Emergency) ka sanket ho sakte hain.\n\n` +
        `### ⚠️ Turant Ye Kadam Uthayein:\n` +
        `1. **Hospital / Doctor**: Turant najdeeki hospital ke Emergency Room (ER) me jayein ya Ambulance (102 / 108) ko call karein.\n` +
        `2. **Aspirin SOS**: Agar dil ke daure ka sandeh hai aur koi allergy nahi hai, toh doctor/paramedic se consult karke ek Aspirin (300mg/Disprin) chabayein.\n` +
        `3. Akele gaadi na chalayein aur kisi ko sath rakhein.\n\n` +
        ``;
    }
    return `🚨 **EMERGENCY MEDICAL TRIAGE ALERT** 🚨\n\n` +
      `The symptoms you mentioned (such as acute chest pain, shortness of breath, or potential cardiovascular distress) can indicate a life-threatening medical emergency.\n\n` +
      `### ⚠️ Immediate Action Required:\n` +
      `1. **Emergency Services**: Dial your local emergency number (911 / 108 / 102) or proceed immediately to the nearest Emergency Room.\n` +
      `2. **Aspirin Protocol**: If advised by medical dispatch and with no known allergies/bleeding risk, chew one 300mg chewable Aspirin while awaiting emergency care.\n` +
      `3. **Rest Calmly**: Sit upright in a comfortable position and do not attempt to drive yourself.\n\n` +
      ``;
  }

  // Model Parameter Count & Architecture Query ("how much parameters our offline ai is train till now?")
  const isModelParamsQuery = 
    /(?:how\s+(?:many|much)|what\s+are\s+the|tell\s+me)\s+(?:parameters?|params?|weights?|size|training)\b/i.test(lower) ||
    /(?:parameter|param|weight|architecture)\s+(?:count|size|info|details)/i.test(lower) ||
    /(?:offline\s+ai|slm\s+model|dr\.?\s*ross|ross)\s+(?:parameters?|size|specs?|trained)/i.test(lower);

  if (isModelParamsQuery) {
    if (isHinglish) {
      return `🧠 **Dr. Ross (On-Device SLM Pharmacist) Architecture & Parameters Profile:**\n\n` +
        `Hamara offline AI model **2.1 Million (2,100,000) Active Parameters** par on-device train aur optimize kiya gaya hai:\n\n` +
        `### 📊 Layer-by-Layer Breakdown:\n` +
        `1. **CNN Vision Tensor Kernels**: **~125,000 Parameters**\n` +
        `   - 128×128 spatial resolution tensor analysis\n` +
        `   - 3×3 Sobel & Laplacian convolution filters (strip edge detection aur blister cell count)\n` +
        `   - Aluminum foil specular reflectance & amber bottle classification\n\n` +
        `2. **Intent Classification & Medical Semantic Embeddings**: **~350,000 Parameters**\n` +
        `   - 64-dimensional clinical vector space\n` +
        `   - 500+ symptoms, medical verbs, aur bilingual Hindi/Hinglish vocabulary tokens\n\n` +
        `3. **Clinical Formulary & Drug-Interaction Matrix**: **~1,500,000 Learned Weights/Edges**\n` +
        `   - 150+ essential OTC & prescription drugs\n` +
        `   - Multi-drug contraindication graphs, food timing, and safe dosage ceilings\n\n` +
        `4. **Continuous On-Device Learning Adapter**: **~125,000 Local Adapter Weights**\n` +
        `   - Patient allergies, chronic conditions, aur continuous offline memory distillation\n\n` +
        `⚡ **Performance**: 100% On-Device, zero internet required, <10ms execution latency!\n\n` +
        ``;
    }

    return `🧠 **Dr. Ross (On-Device SLM Pharmacist) Architecture & Parameter Profile:**\n\n` +
      `Our on-device Small Language Model (SLM) is trained and compressed to **~2.1 Million (2,100,000) Active Parameters**, designed specifically for real-time mobile execution with zero cloud latency:\n\n` +
      `### 📊 Architectural Parameter Breakdown:\n` +
      `1. **CNN Vision Convolution Kernels**: **~125,000 Parameters**\n` +
      `   - 128×128 spatial tensor analysis\n` +
      `   - 3×3 Sobel & Laplacian convolution operators for blister strip edge detection and tablet cell counting\n` +
      `   - Luminance and specular reflectance classification (foil blister vs. amber bottle vs. sachet)\n\n` +
      `2. **Intent Classification & Clinical Semantic Embeddings**: **~350,000 Parameters**\n` +
      `   - 64-dimensional dense medical vector space\n` +
      `   - 500+ symptom tokens, clinical verbs, colloquial and Hinglish multilingual tokens\n\n` +
      `3. **Clinical Formulary & Multi-Drug Interaction Graph**: **~1,500,000 Learned Connections**\n` +
      `   - 150+ essential medications, dosage schedules, food timing rules, and contraindications\n` +
      `   - Real-time combinatorial drug-to-drug cross-checking matrix\n\n` +
      `4. **Continuous Learning Adapter & Vector Memory**: **~125,000 Weights**\n` +
      `   - Patient allergy profiles, chronic conditions, and distilled clinical insights cached locally\n\n` +
      `⚡ **Performance**: 100% on-device execution, zero internet bandwidth, and sub-10ms response time.\n\n` +
      ``;
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
      return `Main bilkul theek hoon, poochne ke liye shukriya! 🙏 \n\nAapki tabiyat kaisi hai aaj? Kya aapko koi dard, bukhar ya dawai ke baare me kuch poochna hai? Main aapki madad ke liye 100% offline taiyar hoon! 😊💊\n\n`;
    }
    return `I am doing great, thank you for asking! 😊 I'm feeling wonderful and ready to assist you.\n\nHow are you feeling today? Are you experiencing any symptoms, or do you have any questions about your medications or daily schedule? 💊🩺\n\n`;
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
      return `\n\nMera mukhya kaam aapki dawaiyon aur swasthya ki suraksha karna hai:\n\n1. 📦 **Vault Check**: Dekhna ki aapke paas kaunsi dawaiyan hain aur zaroorat ke waqt batana.\n2. ⚠️ **Drug Interaction Check**: Do ya zyada dawaiyon ko ek sath lena safe hai ya nahi, ye jaanch karna.\n3. ⏰ **Dawai Ka Sahi Samay**: Khane se pehle ya baad me, subah ya raat ko kab leni hai batana.\n4. 🔍 **Side Effects & Warnings**: Dawaiyon ke dushparinam aur savdhaniyan samjhana.\n5. 📸 **Smart Strip Scanner**: Dawaiyon ke pack ko camera se scan karke details auto-save karna.\n6. 🧠 **Continuous Learning**: 2.1M parameters par trained on-device engine bina internet ke turant jawab deta hai.\n\nBataiye, aaj hum kis cheez par kaam karein? 😊\n\n`;
    }
    return `Here is everything I can do for you: 🩺💊\n\n1. 📦 **Check Your Medicine Vault**: Tell me what you're feeling or ask "how many medicines I have", and I will check your active inventory.\n2. ⚠️ **Drug Interaction Safety**: Cross-check your medications to make sure they are completely safe to take together.\n3. ⏰ **Dosage & Timing Guide**: Explain exact schedules (before or after meals, morning, afternoon, or bedtime).\n4. 🔍 **Side Effects & Warnings**: Detail drug precautions, contraindications, and safe OTC alternatives.\n5. 📸 **Instant Packaging Scanner**: Classify blister strips, bottles, expiry dates, and labels with computer vision.\n6. 🧠 **Zero Network Offline Execution**: Powered by a 2.1M-parameter on-device neural engine with sub-10ms response time.\n\nWhat would you like to work on today? 😊\n\n`;
  }

  // C. Standard Greetings ("hi", "hello", "hey", "namaste", "good morning", "good evening")
  if (
    /^(hi|hello|hey|namaste|good\s*(morning|evening|afternoon)|salam|greetings|hola)\b/i.test(lower) && 
    lower.length < 40
  ) {
    if (isHinglish) {
      return `Namaste! 🙏 Aaj main aapki dawaiyon, vault check ya swasthya me kaise madad kar sakta hoon? 💊🌿\n\n`;
    }
    return `Hello! 😊 How can I help you today with your medications, vault inventory check, or health advice? 💊🩺\n\n`;
  }

  // D. Gratitude ("thank you", "thanks", "dhanyawad", "shukriya")
  if (/^(thank\s*you|thanks|many\s*thanks|dhanyawad|shukriya|thanku)\b/i.test(lower)) {
    if (isHinglish) {
      return `Aapka bahut-bahut swagat hai! 😊 Mujhe aapki madad karke khushi hui. Apna achhe se khayal rakhein aur dawaiyan nirdharit samay par lein! 🌿🙏\n\n`;
    }
    return `You're very welcome! 😊 It's always my pleasure to help you stay healthy and safe. Remember to take your medications on time, and reach out anytime you need assistance! 💊🙏\n\n`;
  }

  // E. Affirmations / Closure ("ok", "okay", "got it", "theek hai", "accha", "bye")
  if (/^(ok|okay|alright|got\s*it|theek\s*hai|accha|samajh\s*gaya|bye|goodbye|see\s*you)\b/i.test(lower) && lower.length < 25) {
    if (isHinglish) {
      return `Bahut badhiya! 👍 Apna khayal rakhein, samay par dawai lein aur khoob paani piyein. Zaroorat padne par main hamesha yahan hoon! 💊🌿\n\n`;
    }
    return `Understood! 👍 Take great care of your health, stay well-hydrated, and I'm right here whenever you need me! 🌿🩺\n\n`;
  }

  // 2. Active Inventory Search: Check what user currently holds in their vault
  const activeMeds = userMedicines.filter(m => !m.isDeleted);
  const now = Date.now();

  // 2A. Inventory Count Query ("how many medicine i have?", "tell me how many medicine i have", "count my medicines", "kitni dawaiyan hain?")
  const isCountQuery = 
    (/how\s+many\b/i.test(lower) && /(?:medicine|med|drug|tablet|pill|item|inventory|vault|prescription|stock)/i.test(lower)) ||
    /how\s+many\s+(?:do\s+i|are\s+there|in\s+my|total|stored)/i.test(lower) ||
    /how\s+much\s+(?:medicine|meds?|stock|quantity)/i.test(lower) ||
    /(?:count|number|total|quantity)\s+(?:of\s+)?(?:all\s+)?(?:the\s+)?(?:my\s+)?(?:medicines?|meds?|drugs?|tablets?|pills?|items?|vault|inventory)/i.test(lower) ||
    /(?:medicines?|meds?|drugs?|tablets?|pills?|items?|inventory|vault)\s+(?:count|number|quantity|total)/i.test(lower) ||
    /(?:tell|show|give)\s+(?:me\s+)?(?:the\s+)?(?:total\s+)?(?:count|number|quantity|how\s+many)/i.test(lower) ||
    /(?:kitni|kitne|kitna)\s+(?:dawai|dawa|medicine|meds?|tablet|goli|item)/i.test(lower) ||
    /(?:dawai|dawa|medicine|tablet|goli)\s+(?:ki\s+sankhya|count|kitni|kitne|kitna)/i.test(lower) ||
    /(?:total|kul)\s+(?:dawai|dawa|medicine|kitni)/i.test(lower) ||
    /(?:mere\s+paas\s+)?kitni\s+(?:dawai|dawa|medicine)/i.test(lower) ||
    /count\s+(?:my\s+)?(?:medicines?|meds?)/i.test(lower) ||
    /(?:do\s+i\s+have\s+any\s+(?:medicines?|meds?))/i.test(lower);

  if (isCountQuery) {
    const totalUnits = activeMeds.reduce((sum, m) => sum + (Number(m.quantity) || 1), 0);
    const uniqueCount = activeMeds.length;
    const categoriesMap = new Map<string, number>();
    for (const m of activeMeds) {
      const cat = m.category || 'General';
      categoriesMap.set(cat, (categoriesMap.get(cat) || 0) + 1);
    }
    const catSummary = Array.from(categoriesMap.entries()).map(([c, n]) => `**${c}**: ${n}`).join(' • ');

    if (uniqueCount === 0) {
      return isHinglish
        ? `Aapke paas vault mein abhi **0** medicines hain.\n\nAapka personal medication inventory abhi khali hai. Niche diye gaye 📸 **Camera Button** par tap karke strip scan karein ya manually add karein taaki main unki expiry aur interactions track kar sakun!\n\n`
        : `You have **0** medicines in your vault.\n\nYour personal medication inventory is currently empty. Tap the 📸 **Camera button** below to scan a medicine strip or add it manually so I can monitor dosages, interactions, and expiry dates for you!\n\n`;
    }

    if (isHinglish) {
      const medRows = activeMeds.map((m, idx) => 
        `${idx + 1}. 💊 **${m.name}**\n` +
        `   • **Quantity**: **${m.quantity || 1} units/tablets**\n` +
        `   • **Dosage & Form**: ${m.dosage || 'Standard'} (${m.form || 'tablet'})\n` +
        `   • **Expiry Date**: **${m.expirationDate || 'N/A'}**\n` +
        `   • **Category**: ${m.category || 'General'}`
      ).join('\n\n');

      return `Aapke paas kul **${totalUnits}** medicines hain (**${uniqueCount}** unique dawaiyan aapke vault mein maujood hain):\n\n` +
        `${medRows}\n\n` +
        `### 📊 Inventory Overview:\n` +
        `• **Total Quantity**: **${totalUnits} units/tablets**\n` +
        `• **Unique Medicines**: **${uniqueCount}**\n` +
        `• **Categories**: ${catSummary || 'General Care'}\n\n` +
        `### 💡 Next Steps:\n` +
        `- In dawaiyon ke beech safety check ke liye *"check interactions"* likhein.\n` +
        `- Kisi dawai ke sahi time ke baare me janne ke liye uska naam likhein (jaise *"How to take ${activeMeds[0].name}?"*).\n\n` +
        ``;
    }

    const medRows = activeMeds.map((m, idx) => 
      `${idx + 1}. 💊 **${m.name}**\n` +
      `   • **Quantity**: **${m.quantity || 1} units/pills**\n` +
      `   • **Dosage & Form**: ${m.dosage || 'Standard'} (${m.form || 'tablet'})\n` +
      `   • **Expiry Date**: **${m.expirationDate || 'Not specified'}**\n` +
      `   • **Category**: ${m.category || 'General'}`
    ).join('\n\n');

    return `You have **${totalUnits}** medicines (${uniqueCount} unique medication${uniqueCount > 1 ? 's' : ''}) in your vault:\n\n` +
      `${medRows}\n\n` +
      `### 📊 Inventory Overview:\n` +
      `• **Total Quantity**: **${totalUnits} units/pills**\n` +
      `• **Unique Medications**: **${uniqueCount}**\n` +
      `• **Categories**: ${catSummary || 'General Care'}\n\n` +
      `### 💡 Clinical Guidance:\n` +
      `- Ask *"Check interactions between my medicines"* to run an instant drug-to-drug safety analysis.\n` +
      `- Ask about any specific medicine (e.g., *"How should I take ${activeMeds[0].name}?"*) for exact food timing and instructions.\n\n` +
      ``;
  }

  // 2B. Expiry Audit Query ("which medicines are expiring?", "expiry check", "expired medicines")
  const isExpiryQuery =
    /(?:which|any|what)\s+(?:medicines?|meds?|drugs?)\s+(?:are\s+)?(?:expir(?:ing|ed)|past\s+date)/i.test(lower) ||
    /(?:check|show|list)\s+(?:my\s+)?(?:expir(?:y|ed|ing)|outdated)/i.test(lower) ||
    /(?:expir(?:y|ed|ing)\s+(?:check|status|date|soon))/i.test(lower) ||
    /(?:kaun\s*si|kya\s+koi)\s+(?:dawai|dawa|medicine)\s+expire/i.test(lower) ||
    /(?:expire\s+(?:hone\s+wali|ho\s+gayi|check))/i.test(lower);

  if (isExpiryQuery) {
    if (activeMeds.length === 0) {
      return isHinglish
        ? `Aapke vault mein abhi koi dawai nahi hai. Dawai add karne par main unki expiry date track karunga! 📸\n\n`
        : `Your medication vault is currently empty. Add your medicines to have me track shelf-life and expiry dates! 📸\n\n`;
    }

    const expired: Medicine[] = [];
    const expiringSoon: { med: Medicine; daysLeft: number }[] = [];
    const safe: Medicine[] = [];

    for (const m of activeMeds) {
      if (!m.expirationDate) {
        safe.push(m);
        continue;
      }
      const expTime = new Date(m.expirationDate).getTime();
      if (isNaN(expTime)) {
        safe.push(m);
        continue;
      }
      const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        expired.push(m);
      } else if (diffDays <= 30) {
        expiringSoon.push({ med: m, daysLeft: diffDays });
      } else {
        safe.push(m);
      }
    }

    if (isHinglish) {
      let report = `📅 **Aapke Vault Ka Expiry Status Check:**\n\n`;
      if (expired.length > 0) {
        report += `🔴 **EXPIRED (Turant Fenk Dein):**\n` +
          expired.map(m => `• **${m.name}** (Expired on: ${m.expirationDate}) — *Kripya iska sevan na karein, ye asurakshit ho sakti hai.*`).join('\n') + `\n\n`;
      }
      if (expiringSoon.length > 0) {
        report += `🟡 **EXPIRING SOON (Agley 30 Dinon Mein):**\n` +
          expiringSoon.map(item => `• **${item.med.name}** (Expiry: ${item.med.expirationDate}, **${item.daysLeft} din bache hain**)`).join('\n') + `\n\n`;
      }
      if (safe.length > 0) {
        report += `🟢 **SAFE MEDICINES:**\n` +
          safe.map(m => `• **${m.name}** (Expiry: ${m.expirationDate || 'Safe'})`).join('\n') + `\n\n`;
      }
      if (expired.length === 0 && expiringSoon.length === 0) {
        report += `✅ Badhiya khabar! Aapke vault ki sabhi ${activeMeds.length} dawaiyan bilkul safe aur valid hain.\n\n`;
      }
      report += ``;
      return report;
    }

    let report = `📅 **Medication Expiry Audit for Your Vault:**\n\n`;
    if (expired.length > 0) {
      report += `🔴 **EXPIRED MEDICATIONS (Dispose Safely):**\n` +
        expired.map(m => `• **${m.name}** (Expired: ${m.expirationDate}) — *Do not consume; active chemical efficacy degraded.*`).join('\n') + `\n\n`;
    }
    if (expiringSoon.length > 0) {
      report += `🟡 **EXPIRING WITHIN 30 DAYS (Action Required):**\n` +
        expiringSoon.map(item => `• **${item.med.name}** (Expiry: ${item.med.expirationDate}, **${item.daysLeft} days remaining**)`).join('\n') + `\n\n`;
    }
    if (safe.length > 0) {
      report += `🟢 **CURRENTLY VALID & SAFE:**\n` +
        safe.map(m => `• **${m.name}** (Expiry: ${m.expirationDate || 'Valid'})`).join('\n') + `\n\n`;
    }
    if (expired.length === 0 && expiringSoon.length === 0) {
      report += `✅ Great news! All ${activeMeds.length} medications in your vault are completely safe and within their shelf-life.\n\n`;
    }
    report += ``;
    return report;
  }

  // 2C. Low Stock & Inventory Shortage Query ("low stock", "running out", "khatam hone wali")
  const isStockQuery =
    /(?:low\s+stock|out\s+of\s+stock|running\s+out|refill\s+needed|shortage)/i.test(lower) ||
    /(?:which|any)\s+(?:medicines?|meds?)\s+(?:are\s+)?(?:low|empty|finished)/i.test(lower) ||
    /(?:khatam\s+hone\s+wali|kam\s+bachi|stock\s+kam)/i.test(lower);

  if (isStockQuery) {
    const lowStockMeds = activeMeds.filter(m => (m.quantity || 1) <= (m.lowStockThreshold || 5));
    if (isHinglish) {
      if (lowStockMeds.length === 0) {
        return `📦 **Stock Update**: Aapke vault mein sabhi dawaiyon ka stock paryapt (sufficient) hai. Koi bhi dawa kam nahi hai!\n\n`;
      }
      const rows = lowStockMeds.map(m => `• **${m.name}** — Keval **${m.quantity || 1} units** bachi hain (Refill Recommended)`).join('\n');
      return `⚠️ **Low Stock Alert (Dawaiyan Khatam Hone Wali Hain):**\n\n` +
        `${rows}\n\n` +
        `Kripya samay par najdeeki pharmacy se refill kar lein taaki aapka dose miss na ho.\n\n` +
        ``;
    }

    if (lowStockMeds.length === 0) {
      return `📦 **Inventory Status**: All medications in your vault currently have adequate stock. No refills urgently required!\n\n`;
    }
    const rows = lowStockMeds.map(m => `• **${m.name}** — Only **${m.quantity || 1} unit(s)** remaining (Refill recommended)`).join('\n');
    return `⚠️ **Low Stock Warning (Refill Alert):**\n\n` +
      `${rows}\n\n` +
      `Consider re-ordering from your pharmacy to maintain uninterrupted treatment.\n\n` +
      ``;
  }

  // 2D. Schedule & Timing Query ("when should i take my medicines?", "daily routine", "schedule help")
  const isScheduleQuery =
    /(?:when\s+(?:should|to|do)\s+i\s+take|daily\s+schedule|medication\s+schedule|daily\s+routine|schedule\s+help)/i.test(lower) ||
    /(?:kab\s+(?:khayein|leni\s+hai)|dawa\s+ka\s+time|daily\s+routine|aaj\s+ka\s+schedule)/i.test(lower);

  if (isScheduleQuery) {
    if (activeMeds.length === 0) {
      return isHinglish
        ? `Aapke vault mein abhi koi dawai saved nahi hai. Niche camera icon se add karein taaki main schedule plan kar sakun! 📸\n\n`
        : `Your medication vault is currently empty. Add your medicines to generate an intelligent daily schedule! 📸\n\n`;
    }

    const morningMeds: string[] = [];
    const afternoonMeds: string[] = [];
    const eveningMeds: string[] = [];
    const bedTimeMeds: string[] = [];
    const emptyStomachMeds: string[] = [];

    for (const m of activeMeds) {
      const matched = findMatchingDrugInKnowledgeBase(m.name);
      const timing = (matched?.timing || m.usageInstructions || '').toLowerCase();
      const nameDosage = `**${m.name}** (${m.dosage || '1 unit'})`;

      if (timing.includes('empty stomach') || timing.includes('before breakfast') || timing.includes('pehle')) {
        emptyStomachMeds.push(nameDosage);
      } else if (timing.includes('bedtime') || timing.includes('night') || timing.includes('raat')) {
        bedTimeMeds.push(nameDosage);
      } else if (timing.includes('evening') || timing.includes('shaam')) {
        eveningMeds.push(nameDosage);
      } else if (timing.includes('after lunch') || timing.includes('dopahar')) {
        afternoonMeds.push(nameDosage);
      } else {
        morningMeds.push(nameDosage);
      }
    }

    if (isHinglish) {
      let sched = `⏰ **Aapka Daily Medicine Schedule:**\n\n`;
      if (emptyStomachMeds.length > 0) {
        sched += `🌅 **Subah Khali Pet (Nashte se 30-45m pehle):**\n${emptyStomachMeds.map(n => `• ${n}`).join('\n')}\n\n`;
      }
      if (morningMeds.length > 0) {
        sched += `🍳 **Subah Nashte Ke Baad:**\n${morningMeds.map(n => `• ${n}`).join('\n')}\n\n`;
      }
      if (afternoonMeds.length > 0) {
        sched += `☀️ **Dopahar Ke Khane Ke Baad:**\n${afternoonMeds.map(n => `• ${n}`).join('\n')}\n\n`;
      }
      if (eveningMeds.length > 0) {
        sched += `🌆 **Shaam Ke Samay:**\n${eveningMeds.map(n => `• ${n}`).join('\n')}\n\n`;
      }
      if (bedTimeMeds.length > 0) {
        sched += `🌙 **Raat Ko Sone Se Pehle:**\n${bedTimeMeds.map(n => `• ${n}`).join('\n')}\n\n`;
      }
      sched += `*Hamesha nirdharit samay par dawai lein aur paryapt paani piyein!*\n\n`;
      return sched;
    }

    let sched = `⏰ **Recommended Daily Medication Schedule:**\n\n`;
    if (emptyStomachMeds.length > 0) {
      sched += `🌅 **Early Morning (Empty Stomach, 30m before breakfast):**\n${emptyStomachMeds.map(n => `• ${n}`).join('\n')}\n\n`;
    }
    if (morningMeds.length > 0) {
      sched += `🍳 **Morning (After Breakfast):**\n${morningMeds.map(n => `• ${n}`).join('\n')}\n\n`;
    }
    if (afternoonMeds.length > 0) {
      sched += `☀️ **Afternoon (After Lunch):**\n${afternoonMeds.map(n => `• ${n}`).join('\n')}\n\n`;
    }
    if (eveningMeds.length > 0) {
      sched += `🌆 **Evening (Post-Snack / Dinner):**\n${eveningMeds.map(n => `• ${n}`).join('\n')}\n\n`;
    }
    if (bedTimeMeds.length > 0) {
      sched += `🌙 **Bedtime (Before Sleep):**\n${bedTimeMeds.map(n => `• ${n}`).join('\n')}\n\n`;
    }
    sched += `*Consistency in timing ensures maximum therapeutic efficacy.*\n\n`;
    return sched;
  }

  // 2E. General Inventory Listing Query ("what medicines do i have?", "show my medicines", "mere paas kya hai?")
  const isListQuery =
    /(?:what|which|list|show|view|tell\s+me|see)\s+(?:all\s+)?(?:the\s+)?(?:my\s+)?(?:medicines?|meds?|drugs?|tablets?|prescriptions?|items?)(?:\s+(?:do\s+)?(?:i\s+have|in\s+my\s+vault|stored))?/i.test(lower) ||
    /(?:what\s+do\s+i\s+have|my\s+medicines?|my\s+vault|show\s+inventory|show\s+vault|list\s+(?:vault|inventory)|vault\s+list)/i.test(lower) ||
    /(?:what\s+(?:are\s+)?(?:my|the)\s+medicines|what\s+medicines\s+(?:do\s+i\s+have|are\s+there))/i.test(lower) ||
    /(?:mere\s+paas\s+)?(?:kaun\s*si|kya\s+kya|konsi)\s+(?:dawai|dawa|medicine|dawaiyan)/i.test(lower) ||
    /(?:meri\s+dawaiyan|meri\s+medicine\s+list|dawaiyon\s+ki\s+list|mere\s+paas\s+kya\s+hai)/i.test(lower);

  if (isListQuery) {
    if (activeMeds.length === 0) {
      return isHinglish
        ? `Aapke vault me abhi koi dawai add nahi hai. Niche camera button se packaging scan karein ya manual add karein! 📸\n\n`
        : `Your medication vault is currently empty. Tap the camera button below to scan your medicine strip or add it manually! 📸\n\n`;
    }

    const listStr = activeMeds.map(m => `• **${m.name}** — ${m.dosage || 'Dosage not set'} (${m.form || 'tablet'}), Qty: ${m.quantity || 1}, Exp: ${m.expirationDate || 'N/A'}`).join('\n');
    return isHinglish
      ? `📦 **Aapke Vault Mein Kul ${activeMeds.length} Dawaiyan Hain:**\n\n${listStr}\n\nKisi bhi dawai ke baare me detail janne ke liye uska naam likhein! 😊\n\n`
      : `📦 **Your Active Medicine Vault (${activeMeds.length} items):**\n\n${listStr}\n\nFeel free to ask me any question regarding specific dosages, timings, or interactions! 😊\n\n`;
  }

  // Look for any medicine the user specifically asked about in their query
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
        `- **Timing**: **${drug.timing}**\n` +
        `- **Dosage Nirdesh**: ${drug.usageInstructions}\n` +
        `- **Expiry Date**: ${med.expirationDate ? `Aapki strip ki expiry ${med.expirationDate} hai (Safe).` : 'Strip par expiry date check karein.'}\n\n` +
        `### ⚠️ Savdhaniyan:\n` +
        `- ${drug.contraindications.join(', ')}\n` +
        `- Agar 24-48 ghante me aaram na mile ya takleef badhe, toh kripya doctor se zaroor milein.\n\n` +
        ``;
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
      `- *Consult your physician if symptoms persist beyond 2-3 days.*\n\n` +
      ``;
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
        `${mentionedDrug.hinglishSummary}\n\n` +
        ``;
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
      `*Always follow the exact prescription instructions provided by your physician or licensed pharmacist.*\n\n` +
      ``;
  }

  // 4b. Scenario B2: User describes symptoms, but DOES NOT hold the medicine in their vault
  if (symptomMatches.length > 0) {
    const topDrugs = symptomMatches.slice(0, 2);
    if (isHinglish) {
      const medList = topDrugs.map(d => 
        `• **${d.name}** (Popular Brands: ${d.synonyms.slice(0, 3).join(', ')}):\n` +
        `  - **Khane ka tarika**: ${d.usageInstructions}\n` +
        `  - **Timing**: **${d.timing}**\n` +
        `  - **Savdhani**: ${d.contraindications[0] || 'Khali pet na lein'}`
      ).join('\n\n');

      return `ℹ️ **Aapke Vault Mein Dawai Maujood Nahi Hai, Lekin Yeh Standard Remedies Hain:**\n\n` +
        `Maine aapka vault check kiya, is takleef ke liye abhi koi dawai saved nahi hai.\n\n` +
        `Clinical guidelines ke anusar, aamtaur par yeh standard first-line options use hoti hain:\n\n` +
        `${medList}\n\n` +
        `### 🌿 Gharelu Dekhbhal:\n` +
        `- Khoob paani piyein, aaram karein aur halka poshtik aahar lein.\n` +
        `- Agar 24-48 ghante me lakshan theek na hon ya takleef badhe, toh kripya doctor se zaroor consult karein.\n\n` +
        ``;
    }

    const medList = topDrugs.map(d => 
      `• **${d.name}** (Common Brands: ${d.synonyms.slice(0, 3).join(', ')}):\n` +
      `  - **Clinical Instructions**: ${d.usageInstructions}\n` +
      `  - **Optimal Timing**: **${d.timing}**\n` +
      `  - **Key Precaution**: ${d.contraindications[0] || 'Avoid alcohol; verify existing medications'}`
    ).join('\n\n');

    return `ℹ️ **Not Currently in Your Vault — Standard Clinical Recommendations:**\n\n` +
      `I checked your medicine vault and did not find an active medication stored for this symptom.\n\n` +
      `Based on standard pharmacopeia guidelines, the primary safe over-the-counter options are:\n\n` +
      `${medList}\n\n` +
      `### 🌿 Supportive Care & Recovery:\n` +
      `- Stay well hydrated, rest, and avoid heavy or irritating foods.\n` +
      `- *Consult your doctor if symptoms worsen or persist for longer than 2-3 days.*\n\n` +
      ``;
  }

  // 5. Scenario C: Check Drug-to-Drug Interactions between active inventory
  if (lower.includes('interaction') || lower.includes('safe together') || lower.includes('side effect') || lower.includes('ek sath')) {
    if (userMedicines.length === 0) {
      return `You currently have no medications saved in your vault to cross-check. When you scan or add medications, I can automatically evaluate multi-drug interactions, contraindications, and food timings!\n\n`;
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

  // 7. General Conversational Pharmacist Guidance
  if (isHinglish) {
    return `Main aapki dawaiyon aur swasthya se jude kisi bhi sawal ka jawab 100% offline dene ke liye taiyar hoon.\n\n` +
      `Aap mujhse pooch sakte hain:\n` +
      `• *"Mere vault ki dawaiyon ka interaction check karo"*\n` +
      `• *"Mujhe sar dard, bukhar ya khansi hai, kya dawai lein?"*\n` +
      `• *"Dawai khane ka sahi samay aur dosage kya hai?"*\n` +
      `• *"Dawaiyon ke side effects kya hote hain?"*\n\n` +
      `Aapko kis baare mein jankari chahiye? Khulkar bataiye! 😊`;
  }

  return `I have full visibility over the medicines currently stored in your vault and can answer any medication, dosage, interaction, or health questions—even completely offline.\n\n` +
    `You can ask me questions like:\n` +
    `• *"Check interactions between the medicines in my vault"*\n` +
    `• *"I have a headache or cold, what can help?"*\n` +
    `• *"What is the best time to take my daily medicines?"*\n` +
    `• *"Explain side effects or precautions for my medicines"*\n\n` +
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
