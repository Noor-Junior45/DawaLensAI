import React from 'react';
import { Pill, CircleDot, FlaskConical, FlaskRound, Sparkles, HelpCircle, Bandage, Droplets } from 'lucide-react';
import { MedicineForm } from './types';

export const MEDICINE_FORM_ICONS: Record<MedicineForm, React.ReactNode> = {
  tablet: <CircleDot size={16} className="text-blue-400" />,
  capsule: <Pill size={16} className="text-purple-400" />,
  syrup: <FlaskConical size={16} className="text-emerald-400" />,
  ampule: <FlaskRound size={16} className="text-orange-400" />,
  powder: <Sparkles size={16} className="text-yellow-400" />,
  tape: <Bandage size={16} className="text-pink-400" />,
  liquid: <Droplets size={16} className="text-cyan-400" />,
  other: <HelpCircle size={16} className="text-white/40" />,
};

export const MEDICINE_FORM_LABELS: Record<MedicineForm, string> = {
  tablet: 'Tablet',
  capsule: 'Capsule',
  syrup: 'Syrup',
  ampule: 'Ampule',
  powder: 'Powder',
  tape: 'Tape',
  liquid: 'Liquid',
  other: 'Other',
};

export const MEDICINE_CATEGORIES = [
  'Heart',
  'Pain Relief',
  'Vitamins',
  'Antibiotics',
  'Diabetes',
  'Digestive',
  'Allergy',
  'Respiratory',
  'Mental Health',
  'Skin Care',
  'Eye & Ear',
  'Other'
] as const;

export type MedicineCategory = typeof MEDICINE_CATEGORIES[number];

export interface CategoryStyle {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  accent: string;
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  'Heart': {
    label: 'Heart',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    dotColor: 'bg-rose-500',
    accent: '#e11d48'
  },
  'Pain Relief': {
    label: 'Pain Relief',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    dotColor: 'bg-amber-500',
    accent: '#d97706'
  },
  'Vitamins': {
    label: 'Vitamins',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
    accent: '#059669'
  },
  'Antibiotics': {
    label: 'Antibiotics',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    dotColor: 'bg-purple-500',
    accent: '#7c3aed'
  },
  'Diabetes': {
    label: 'Diabetes',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    dotColor: 'bg-blue-500',
    accent: '#2563eb'
  },
  'Digestive': {
    label: 'Digestive',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    badgeBorder: 'border-teal-200',
    dotColor: 'bg-teal-500',
    accent: '#0d9488'
  },
  'Allergy': {
    label: 'Allergy',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    dotColor: 'bg-sky-500',
    accent: '#0284c7'
  },
  'Respiratory': {
    label: 'Respiratory',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-700',
    badgeBorder: 'border-cyan-200',
    dotColor: 'bg-cyan-500',
    accent: '#0891b2'
  },
  'Mental Health': {
    label: 'Mental Health',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    dotColor: 'bg-indigo-500',
    accent: '#4f46e5'
  },
  'Skin Care': {
    label: 'Skin Care',
    badgeBg: 'bg-pink-50',
    badgeText: 'text-pink-700',
    badgeBorder: 'border-pink-200',
    dotColor: 'bg-pink-500',
    accent: '#db2777'
  },
  'Eye & Ear': {
    label: 'Eye & Ear',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    badgeBorder: 'border-violet-200',
    dotColor: 'bg-violet-500',
    accent: '#7c3aed'
  },
  'Other': {
    label: 'Other',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    dotColor: 'bg-slate-500',
    accent: '#64748b'
  }
};

export const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  label: 'General',
  badgeBg: 'bg-slate-50',
  badgeText: 'text-slate-700',
  badgeBorder: 'border-slate-200',
  dotColor: 'bg-slate-400',
  accent: '#64748b'
};

export const getCategoryStyle = (category?: string): CategoryStyle => {
  if (!category) return DEFAULT_CATEGORY_STYLE;
  return CATEGORY_STYLES[category] || {
    label: category,
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    dotColor: 'bg-blue-500',
    accent: '#2563eb'
  };
};

export const POPULAR_TAGS = [
  'Daily',
  'Prescription',
  'OTC',
  'Morning',
  'Night',
  'After Meals',
  'Emergency',
  'Blood Pressure',
  'Fever',
  'Immunity',
  'Supplements',
  'Pain Relief',
  'Digestion',
  'Anti-inflammatory'
];

export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'Heart': [
    'heart', 'cardio', 'cardiovascular', 'cardiac', 'blood pressure', 'hypertension',
    'cholesterol', 'angina', 'blood thinner', 'blood thinners', 'antiarrhythmic'
  ],
  'Pain Relief': [
    'pain relief', 'pain', 'painkiller', 'painkillers', 'analgesic', 'analgesics',
    'nsaid', 'nsaids', 'antipyretic', 'antipyretics', 'headache', 'body ache', 'fever', 'arthritis', 'anti-inflammatory'
  ],
  'Vitamins': [
    'vitamins', 'vitamin', 'supplement', 'supplements', 'multivitamin', 'multivitamins',
    'minerals', 'mineral', 'calcium', 'zinc', 'dietary', 'dietary supplements', 'iron', 'd3', 'b12', 'immunity'
  ],
  'Antibiotics': [
    'antibiotics', 'antibiotic', 'antibacterial', 'antifungal', 'antiviral',
    'antiparasitic', 'infection', 'infections', 'antimicrobial'
  ],
  'Diabetes': [
    'diabetes', 'diabetic', 'insulin', 'metformin', 'blood sugar', 'antidiabetic', 'glycemic'
  ],
  'Digestive': [
    'digestive', 'digestion', 'gastro', 'gastrointestinal', 'stomach', 'antacid',
    'antacids', 'ppi', 'ppis', 'laxative', 'laxatives', 'acid reflux', 'acidity', 'ibs', 'gut'
  ],
  'Allergy': [
    'allergy', 'allergies', 'anti-allergy', 'antihistamine', 'antihistamines',
    'cetirizine', 'rhinitis', 'urticaria', 'anti allergic'
  ],
  'Respiratory': [
    'respiratory', 'respiration', 'asthma', 'cough', 'cold', 'broncho',
    'bronchodilator', 'inhaler', 'inhalers', 'chest congestion', 'pulmonary', 'lungs'
  ],
  'Mental Health': [
    'mental health', 'mental', 'psychiatry', 'psychiatric', 'neurology', 'neurological',
    'antidepressant', 'antidepressants', 'anxiety', 'anxiolytic', 'sleep', 'sleep aid', 'mood', 'sedative'
  ],
  'Skin Care': [
    'skin care', 'skin', 'dermatology', 'dermatological', 'derma', 'cream',
    'ointment', 'eczema', 'acne', 'topical'
  ],
  'Eye & Ear': [
    'eye & ear', 'eye and ear', 'eye/ear', 'eye', 'eyes', 'ear', 'ears',
    'ophthalmic', 'eye drops', 'ear drops', 'otic', 'optometry'
  ]
};

export function normalizeCategory(raw?: string | null): string {
  if (!raw) return 'Other';
  const clean = raw.trim().toLowerCase();
  if (!clean || clean === 'other' || clean === 'general' || clean === 'unassigned' || clean === 'unknown' || clean === 'none') {
    return 'Other';
  }

  // 1. Direct standard match
  for (const std of MEDICINE_CATEGORIES) {
    if (std.toLowerCase() === clean) return std;
  }

  // 2. Exact synonym match (prevent substring false positives)
  for (const [stdCat, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (synonyms.includes(clean)) {
      return stdCat;
    }
  }

  // 3. Exact word boundary / whole phrase match
  for (const [stdCat, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    for (const syn of synonyms) {
      if (syn.length >= 4) {
        const regex = new RegExp(`(^|\\b)${syn}(\\b|$)`, 'i');
        if (regex.test(clean)) {
          return stdCat;
        }
      }
    }
  }

  return raw.trim();
}

export function getMedicineCategory(item: { name?: string; category?: string; tags?: string[] }): string {
  // 1. If explicit category is provided and is NOT 'Other' / empty
  if (item.category && item.category.trim() !== '') {
    const norm = normalizeCategory(item.category);
    if (norm !== 'Other') {
      return norm;
    }
  }

  // 2. Check tags for explicit standard categories
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    for (const tag of item.tags) {
      const norm = normalizeCategory(tag);
      if (norm !== 'Other') {
        return norm;
      }
    }
  }

  // 3. If category is missing or 'Other', check medicine name for well-known clinical matches
  const name = (item.name || '').trim().toLowerCase();
  if (name) {
    // Digestive
    if (
      name.includes('pantoprazole') || name.includes('pan-d') || name.includes('pan d') ||
      name.includes('omeprazole') || name.includes('rabeprazole') || name.includes('esomeprazole') ||
      name.includes('digene') || name.includes('gelusil') || name.includes('antacid') ||
      name.includes('ranitidine') || name.includes('famotidine') || name.includes('domperidone') ||
      name.includes('ondansetron') || name.includes('eno') || name.includes('gaviscon') ||
      name.includes('cremaffin') || name.includes('duphalac') || name.includes('sucralfate') ||
      name.includes('panto') || name.includes('rabekind') || name.includes('ocid') ||
      name.includes('aciloc') || name.includes('rantac') || name.includes('omez')
    ) {
      return 'Digestive';
    }

    // Pain Relief
    if (
      name.includes('paracetamol') || name.includes('dolo') || name.includes('crocin') ||
      name.includes('combiflam') || name.includes('ibuprofen') || name.includes('aspirin') ||
      name.includes('diclofenac') || name.includes('tramadol') || name.includes('naproxen') ||
      name.includes('aceclofenac') || name.includes('ketorolac') || name.includes('calpol') ||
      name.includes('meftal') || name.includes('saridon') || name.includes('voveran')
    ) {
      return 'Pain Relief';
    }

    // Heart
    if (
      name.includes('amlodipine') || name.includes('telmisartan') || name.includes('losartan') ||
      name.includes('atorvastatin') || name.includes('rosuvastatin') || name.includes('enalapril') ||
      name.includes('ramipril') || name.includes('metoprolol') || name.includes('atenolol') ||
      name.includes('clopidogrel') || name.includes('ecosprin') || name.includes('cardivas') ||
      name.includes('stamlo') || name.includes('telma') || name.includes('atorva')
    ) {
      return 'Heart';
    }

    // Antibiotics
    if (
      name.includes('amoxicillin') || name.includes('azithromycin') || name.includes('ciprofloxacin') ||
      name.includes('cefixime') || name.includes('augmentin') || name.includes('ceftriaxone') ||
      name.includes('metronidazole') || name.includes('doxycycline') || name.includes('moxikind') ||
      name.includes('azithral') || name.includes('cipol') || name.includes('zifi') ||
      name.includes('taxim') || name.includes('flagyl')
    ) {
      return 'Antibiotics';
    }

    // Diabetes
    if (
      name.includes('metformin') || name.includes('insulin') || name.includes('glimepiride') ||
      name.includes('gliclazide') || name.includes('dapagliflozin') || name.includes('januvia') ||
      name.includes('glycomet') || name.includes('galvus') || name.includes('amaryl')
    ) {
      return 'Diabetes';
    }

    // Vitamins
    if (
      name.includes('becosules') || name.includes('neurobion') || name.includes('supradyn') ||
      name.includes('zincovit') || name.includes('shelcal') || name.includes('evion') ||
      name.includes('folic') || name.includes('limcee') || name.includes('calcium') ||
      name.includes('vitamin') || name.includes('multivitamin') || name.includes('b-complex')
    ) {
      return 'Vitamins';
    }

    // Allergy
    if (
      name.includes('cetirizine') || name.includes('levocetirizine') || name.includes('allegra') ||
      name.includes('fexofenadine') || name.includes('montelukast') || name.includes('loratadine') ||
      name.includes('avil') || name.includes('cetzine') || name.includes('montair')
    ) {
      return 'Allergy';
    }

    // Respiratory
    if (
      name.includes('salbutamol') || name.includes('asthalin') || name.includes('budecort') ||
      name.includes('foracort') || name.includes('ascoril') || name.includes('benadryl') ||
      name.includes('cough') || name.includes('koflet') || name.includes('grilinctus') ||
      name.includes('alex') || name.includes('ambroxol')
    ) {
      return 'Respiratory';
    }

    // Eye & Ear
    if (
      name.includes('ciplox') || name.includes('tobramycin') || name.includes('moxifloxacin') ||
      name.includes('eye drop') || name.includes('ear drop') || name.includes('clearwax') ||
      name.includes('waxsolve') || name.includes('refresh tears')
    ) {
      return 'Eye & Ear';
    }

    // Skin Care
    if (
      name.includes('betnovate') || name.includes('candid') || name.includes('clotrimazole') ||
      name.includes('soframycin') || name.includes('ointment') || name.includes('cream') ||
      name.includes('permethrin') || name.includes('caladryl') || name.includes('quadriderm')
    ) {
      return 'Skin Care';
    }
  }

  // If explicit category was provided, return it normalized
  if (item.category && item.category.trim() !== '') {
    return normalizeCategory(item.category);
  }

  return 'Other';
}

export function getCanonicalCategory(rawCategory?: string, _form?: string, tags?: string[]): string {
  return normalizeCategory(rawCategory);
}

export function isCategoryMatch(
  item: { name?: string; category?: string; form?: string; tags?: string[]; allBatches?: Array<{ name?: string; category?: string; form?: string; tags?: string[] }> },
  selectedCategory: string
): boolean {
  if (!selectedCategory || selectedCategory === 'ALL') return true;

  const targetCategory = normalizeCategory(selectedCategory);

  // Check the medicine item itself
  const itemCategory = getMedicineCategory(item);
  if (itemCategory.toLowerCase() === targetCategory.toLowerCase()) {
    return true;
  }

  // If item is a GroupedMedicine with allBatches, check if ANY batch matches
  if (Array.isArray(item.allBatches) && item.allBatches.length > 0) {
    return item.allBatches.some(b => {
      const batchCat = getMedicineCategory({ name: b.name || item.name, category: b.category, tags: b.tags });
      return batchCat.toLowerCase() === targetCategory.toLowerCase();
    });
  }

  return false;
}

export function calculateDiffDays(dateStr?: string): number {
  if (!dateStr) return 9999;
  const [year, month, day] = dateStr.split('-').map(Number);
  const expiry = new Date();
  if (year && month && day && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
    expiry.setFullYear(year, month - 1, day);
  } else {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return Math.round((parsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    return 9999;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}


