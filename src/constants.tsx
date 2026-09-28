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

