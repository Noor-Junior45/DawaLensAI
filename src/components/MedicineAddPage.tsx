import React, { useState, useEffect, useRef } from 'react';
import { Medicine, MedicineForm } from '../types';
import { 
  ChevronLeft, Plus, Minus, Calendar, Package, Clock, 
  Sparkles, Mail, AlertTriangle, Image as ImageIcon, X, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MEDICINE_FORM_ICONS, 
  MEDICINE_FORM_LABELS, 
  MEDICINE_CATEGORIES, 
  getCategoryStyle, 
  POPULAR_TAGS, 
  getMedicineCategories 
} from '../constants';
import { categorizeMedicinesWithAI } from '../services/geminiService';
import { useEdgeSwipeBack } from '../utils/mobileGestures';
import { triggerLightHaptic, triggerSuccessHaptic, triggerSelectionHaptic } from '../utils/haptics';

interface MedicineAddPageProps {
  initialData?: Partial<Medicine> | null;
  extractionWarning?: string | null;
  allMedicines: Medicine[];
  globalLowQuantityThreshold: number;
  isSaving?: boolean;
  onSave: (data: Partial<Medicine>) => Promise<void> | void;
  onBack: () => void;
}

const FORM_OPTIONS: MedicineForm[] = [
  'tablet', 'capsule', 'syrup', 'ampule', 
  'powder', 'tape', 'liquid', 'other'
];

const SCHEDULE_PRESETS = [
  'Morning',
  'Afternoon',
  'Evening',
  'Bedtime',
  'Twice Daily',
  'After Meals',
  'Before Meals'
];

export const MedicineAddPage: React.FC<MedicineAddPageProps> = ({
  initialData,
  extractionWarning,
  allMedicines,
  globalLowQuantityThreshold,
  isSaving = false,
  onSave,
  onBack
}) => {
  // Mobile Edge-Swipe from left to navigate back
  useEdgeSwipeBack({ onBack });
  const [formData, setFormData] = useState<Partial<Medicine>>({
    name: initialData?.name || '',
    dosage: initialData?.dosage || '',
    form: initialData?.form || 'tablet',
    quantity: initialData?.quantity ?? 1,
    expirationDate: initialData?.expirationDate || '',
    schedule: initialData?.schedule || '',
    usageInstructions: initialData?.usageInstructions || '',
    category: initialData?.category || 'Other',
    categories: Array.isArray(initialData?.categories) 
      ? [...initialData.categories] 
      : (initialData?.category ? initialData.category.split(/[,/&]/).map(s => s.trim()).filter(Boolean) : ['Other']),
    tags: Array.isArray(initialData?.tags) ? [...initialData.tags] : [],
    enableLowStockAlert: initialData?.enableLowStockAlert !== false,
    lowStockThreshold: initialData?.lowStockThreshold ?? globalLowQuantityThreshold,
    enableEmailExpiryAlert: initialData?.enableEmailExpiryAlert !== false,
    enableEmailLowStockAlert: initialData?.enableEmailLowStockAlert !== false,
    imageUrl: initialData?.imageUrl || '',
    capturedImage: initialData?.capturedImage || ''
  });

  const [suggestions, setSuggestions] = useState<Medicine[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isGeminiCategorizing, setIsGeminiCategorizing] = useState(false);
  const [geminiNotice, setGeminiNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGeminiCategorize = async () => {
    if (isGeminiCategorizing || !formData.name?.trim()) return;
    setIsGeminiCategorizing(true);
    setGeminiNotice(null);
    try {
      const results = await categorizeMedicinesWithAI([{
        id: 'new',
        name: formData.name,
        dosage: formData.dosage,
        usageInstructions: formData.usageInstructions,
        form: formData.form
      }]);

      if (results && results.length > 0) {
        const item = results[0];
        const cats = Array.isArray(item.categories) && item.categories.length > 0
          ? item.categories
          : (item.category ? item.category.split(/[,/&]/).map(s => s.trim()).filter(Boolean) : []);
        
        if (cats.length > 0) {
          setFormData(prev => ({
            ...prev,
            categories: cats,
            category: cats.join(', '),
            tags: Array.from(new Set([...(prev.tags || []), ...cats.filter(c => c !== 'Other')]))
          }));
          setGeminiNotice(`Categories set to "${cats.join(', ')}" by Gemini AI!`);
          setTimeout(() => setGeminiNotice(null), 4000);
        }
      }
    } catch (e: any) {
      console.error("Gemini categorize error:", e);
      setGeminiNotice("AI classification failed: " + (e.message || String(e)));
    } finally {
      setIsGeminiCategorizing(false);
    }
  };

  // Auto-expand textarea according to text length (no scrollbar)
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(90, textareaRef.current.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [formData.usageInstructions]);

  useEffect(() => {
    if (initialData) {
      const initialCats = Array.isArray(initialData.categories) && initialData.categories.length > 0
        ? [...initialData.categories]
        : (initialData.category ? initialData.category.split(/[,/&]/).map(s => s.trim()).filter(Boolean) : ['Other']);

      setFormData({
        name: initialData.name || '',
        dosage: initialData.dosage || '',
        form: initialData.form || 'tablet',
        quantity: initialData.quantity ?? 1,
        expirationDate: initialData.expirationDate || '',
        schedule: initialData.schedule || '',
        usageInstructions: initialData.usageInstructions || '',
        category: initialData.category || initialCats.join(', ') || 'Other',
        categories: initialCats,
        tags: Array.isArray(initialData.tags) ? [...initialData.tags] : [],
        enableLowStockAlert: initialData.enableLowStockAlert !== false,
        lowStockThreshold: initialData.lowStockThreshold ?? globalLowQuantityThreshold,
        enableEmailExpiryAlert: initialData.enableEmailExpiryAlert !== false,
        enableEmailLowStockAlert: initialData.enableEmailLowStockAlert !== false,
        imageUrl: initialData.imageUrl || '',
        capturedImage: initialData.capturedImage || ''
      });
    }
  }, [initialData, globalLowQuantityThreshold]);

  const updateField = (field: keyof Medicine, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const currentCategories = React.useMemo(() => {
    return getMedicineCategories(formData);
  }, [formData.categories, formData.category, formData.tags, formData.name]);

  const toggleCategory = (catKey: string) => {
    triggerSelectionHaptic();
    const isAlreadySelected = currentCategories.some(c => c.toLowerCase() === catKey.toLowerCase());
    let nextCats: string[];
    if (isAlreadySelected) {
      nextCats = currentCategories.filter(c => c.toLowerCase() !== catKey.toLowerCase());
      if (nextCats.length === 0) nextCats = ['Other'];
    } else {
      nextCats = [...currentCategories.filter(c => c.toLowerCase() !== 'other'), catKey];
    }
    setFormData(prev => ({
      ...prev,
      categories: nextCats,
      category: nextCats.join(', '),
      tags: Array.from(new Set([...(prev.tags || []), ...nextCats.filter(c => c !== 'Other')]))
    }));
  };

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim();
    if (!clean) return;
    triggerSelectionHaptic();
    setFormData(prev => {
      const currentTags = Array.isArray(prev.tags) ? [...prev.tags] : [];
      if (currentTags.some(t => t.toLowerCase() === clean.toLowerCase())) return prev;
      return {
        ...prev,
        tags: [...currentTags, clean]
      };
    });
    setCustomTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    triggerLightHaptic();
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(t => t.toLowerCase() !== tagToRemove.toLowerCase())
    }));
  };

  const handleNameChange = (name: string) => {
    updateField('name', name);

    // Auto-detect dual-indication categories if user hasn't explicitly customized yet
    const nameLower = name.trim().toLowerCase();
    if (
      nameLower.includes('zerodol p') || nameLower.includes('zerodol-p') || nameLower.includes('combiflam') ||
      nameLower.includes('dolo') || nameLower.includes('crocin') || nameLower.includes('paracetamol') ||
      nameLower.includes('calpol') || nameLower.includes('aceclofenac') || nameLower.includes('ibuprofen')
    ) {
      setFormData(prev => {
        const isDefault = !prev.categories || prev.categories.length === 0 || (prev.categories.length === 1 && prev.categories[0] === 'Other');
        if (isDefault) {
          const dualCats = ['Fever', 'Pain Relief'];
          return {
            ...prev,
            name,
            categories: dualCats,
            category: dualCats.join(', '),
            tags: Array.from(new Set([...(prev.tags || []), ...dualCats]))
          };
        }
        return { ...prev, name };
      });
    }

    if (name.length > 1) {
      const filtered = allMedicines.filter(m => 
        m.name.toLowerCase().includes(name.toLowerCase())
      );
      const unique = filtered.filter((m, index, self) => 
        index === self.findIndex((t) => t.name.toLowerCase() === m.name.toLowerCase())
      ).slice(0, 3);
      setSuggestions(unique);
    } else {
      setSuggestions([]);
    }
  };

  const applySuggestion = (s: Medicine) => {
    setFormData(prev => ({
      ...prev,
      name: s.name,
      dosage: s.dosage || prev.dosage,
      form: s.form || prev.form,
      schedule: s.schedule || prev.schedule,
      usageInstructions: s.usageInstructions || prev.usageInstructions
    }));
    setSuggestions([]);
  };

  const handleQuantityDelta = (delta: number) => {
    const current = typeof formData.quantity === 'number' ? formData.quantity : 0;
    const next = Math.max(0, current + delta);
    updateField('quantity', next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;
    const finalCats = getMedicineCategories(formData);
    const cleanFormData = {
      ...formData,
      categories: finalCats,
      category: finalCats.join(', '),
      tags: Array.from(new Set([...(formData.tags || []), ...finalCats.filter(c => c !== 'Other')]))
    };
    onSave(cleanFormData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-0 z-50 bg-[#faf8f5] overflow-y-auto flex flex-col text-[#1f1f1f]"
    >
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-[#faf8f5]/95 backdrop-blur-md border-b border-[#e3e2e0] px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 rounded-full text-slate-800 hover:text-black hover:bg-black/5 active:scale-95 transition-all"
            title="Back"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Add Medicine
          </h1>
        </div>
      </header>

      {/* Main Add Form */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Scanned Image Preview if present */}
          {formData.capturedImage && (
            <div className="space-y-3">
              <div className="bg-white border border-[#e3e2e0] rounded-2xl p-3 flex items-center gap-3 shadow-xs">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  <img src={formData.capturedImage} alt="Scanned label" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <ImageIcon size={14} className="text-[#0f9d58]" /> Scanned Packaging Label
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    Verify auto-filled details against physical packaging below
                  </p>
                </div>
              </div>

              {/* Mandatory Physical Packaging Check Warning (Play Health Safety Policy) */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2.5 text-xs">
                <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-amber-900 block uppercase tracking-wider text-[11px]">
                    ⚠️ Check Physical Packaging Before Saving
                  </span>
                  <p className="leading-relaxed text-amber-900 font-medium">
                    Automated scans may misread small text or numbers. Always inspect the printed manufacturer box, blister pack, and expiration date on your physical medicine before confirming or taking any dose.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Extraction Warning Banner if present */}
          {extractionWarning && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2.5 text-xs sm:text-sm">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{extractionWarning}</p>
            </div>
          )}

          {/* 1. Medicine Name Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
              Medicine Name *
            </label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Paracetamol"
              className="w-full px-4 py-3.5 rounded-2xl bg-white border border-[#e3e2e0] text-slate-900 text-base sm:text-lg font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f9d58] focus:border-transparent transition-all shadow-xs"
            />

            {/* Quick autocomplete suggestions */}
            {suggestions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Sparkles size={12} className="text-[#0f9d58]" /> Quick:
                </span>
                {suggestions.map((s, sIdx) => (
                  <button
                    key={`add-sug-${s.id || s.name}-${sIdx}`}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-[#0f9d58] border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    {s.name} ({s.dosage})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Medicine Form Switcher */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
              Medicine Form
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FORM_OPTIONS.map((formKey, fIdx) => {
                const isSelected = formData.form === formKey;
                return (
                  <button
                    key={`add-form-${formKey}-${fIdx}`}
                    type="button"
                    onClick={() => updateField('form', formKey)}
                    className={`flex items-center gap-2 px-3 py-2.5 sm:py-3 rounded-2xl border text-xs sm:text-sm font-bold transition-all text-left ${
                      isSelected
                        ? 'bg-emerald-50 border-[#0f9d58] text-[#0f9d58] shadow-xs ring-1 ring-[#0f9d58]'
                        : 'bg-white border-[#e3e2e0] text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span className="shrink-0">{MEDICINE_FORM_ICONS[formKey]}</span>
                    <span className="truncate">{MEDICINE_FORM_LABELS[formKey]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Dosage & Stock (Quantity) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dosage */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                Dosage
              </label>
              <div className="relative">
                <Package size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.dosage || ''}
                  onChange={(e) => updateField('dosage', e.target.value)}
                  placeholder="e.g. 500mg, 10ml"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-[#e3e2e0] text-slate-900 text-base font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f9d58] focus:border-transparent transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Quantity Stepper */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                Quantity (Stock)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuantityDelta(-1)}
                  className="w-12 h-12 rounded-2xl bg-white border border-[#e3e2e0] flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-black active:scale-95 transition-all shadow-xs shrink-0"
                >
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  min="0"
                  value={formData.quantity ?? ''}
                  onChange={(e) => updateField('quantity', e.target.value === '' ? undefined : Number(e.target.value))}
                  placeholder="0"
                  className="w-full text-center py-3 rounded-2xl bg-white border border-[#e3e2e0] text-slate-900 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#0f9d58] focus:border-transparent transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityDelta(1)}
                  className="w-12 h-12 rounded-2xl bg-white border border-[#e3e2e0] flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-black active:scale-95 transition-all shadow-xs shrink-0"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Category Selection (Multi-select) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Categories (Select One or More)
                </label>
                <span className="text-[11px] font-bold text-[#0f9d58] bg-[#0f9d58]/10 px-2 py-0.5 rounded-full">
                  {currentCategories.length} selected
                </span>
              </div>
              <button
                type="button"
                onClick={handleGeminiCategorize}
                disabled={isGeminiCategorizing || !formData.name?.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all active:scale-95 disabled:opacity-50 shadow-2xs cursor-pointer"
                title="Let Gemini AI detect categories for this medicine"
              >
                {isGeminiCategorizing ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-indigo-600" />
                    <span>Detecting with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-indigo-600" />
                    <span>AI Detect Categories</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Feedback Notice */}
            <AnimatePresence>
              {geminiNotice && (
                <motion.div
                  key="add-gemini-notice"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600 shrink-0" />
                    <span>{geminiNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeminiNotice(null)}
                    className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-[11.5px] text-slate-500">
              Select multiple categories if this medicine has dual therapeutic uses (e.g. Zerodol-P as both <strong>Fever</strong> and <strong>Pain Relief</strong>).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {MEDICINE_CATEGORIES.map((catKey, cIdx) => {
                const isSelected = currentCategories.some(c => c.toLowerCase() === catKey.toLowerCase());
                const style = getCategoryStyle(catKey);
                return (
                  <button
                    key={`add-cat-${catKey}-${cIdx}`}
                    type="button"
                    onClick={() => toggleCategory(catKey)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer active:scale-95 ${
                      isSelected
                        ? `${style.badgeBg} ${style.badgeText} border-current ring-1 ring-current shadow-xs`
                        : 'bg-white border-[#e3e2e0] text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${style.dotColor}`} />
                      <span className="truncate">{catKey}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-black shrink-0">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Tags Section */}
            <div className="pt-2 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Custom Tags
              </label>
              {Array.isArray(formData.tags) && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.tags.map((tag, tIdx) => (
                    <span 
                      key={`tag-${tag}-${tIdx}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-emerald-600 hover:text-emerald-900 ml-0.5 p-0.5 cursor-pointer"
                        title={`Remove tag ${tag}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(customTagInput);
                    }
                  }}
                  placeholder="Add custom tag (e.g. Prescription, SOS, Daily)"
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white border border-[#e3e2e0] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f9d58]"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(customTagInput)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  + Add Tag
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10.5px] text-slate-400 font-medium">Quick add:</span>
                {POPULAR_TAGS.filter(t => !(formData.tags || []).includes(t)).slice(0, 6).map((popTag, pIdx) => (
                  <button
                    key={`poptag-${popTag}-${pIdx}`}
                    type="button"
                    onClick={() => handleAddTag(popTag)}
                    className="text-[10px] font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    + {popTag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Expiration Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
              Expiration Date *
            </label>
            <div className="relative">
              <Calendar size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                required
                value={formData.expirationDate || ''}
                onChange={(e) => updateField('expirationDate', e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-[#e3e2e0] text-slate-900 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f9d58] focus:border-transparent transition-all shadow-xs"
              />
            </div>
          </div>

          {/* 5. Medication Schedule */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
              Medication Schedule
            </label>
            <div className="relative">
              <Clock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={formData.schedule || ''}
                onChange={(e) => updateField('schedule', e.target.value)}
                placeholder="e.g. Morning after meals"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-[#e3e2e0] text-slate-900 text-base font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f9d58] focus:border-transparent transition-all shadow-xs"
              />
            </div>

            {/* Quick schedule preset pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {SCHEDULE_PRESETS.map((preset, pIdx) => (
                <button
                  key={`add-sched-${preset}-${pIdx}`}
                  type="button"
                  onClick={() => {
                    const current = formData.schedule || '';
                    if (current.includes(preset)) return;
                    updateField('schedule', current ? `${current}, ${preset}` : preset);
                  }}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-[#e3e2e0] text-slate-700 hover:border-slate-400 hover:text-black transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Usage Instructions - Auto Expandable according to text length */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
              Usage Instructions
            </label>
            <textarea
              ref={textareaRef}
              value={formData.usageInstructions || ''}
              onChange={(e) => {
                updateField('usageInstructions', e.target.value);
                adjustTextareaHeight();
              }}
              onInput={adjustTextareaHeight}
              placeholder="e.g. Take with a full glass of water. Avoid taking on empty stomach."
              className="w-full p-4 rounded-2xl bg-white border border-[#e3e2e0] text-slate-900 text-base font-normal placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f9d58] focus:border-transparent transition-all shadow-xs overflow-hidden resize-none leading-relaxed"
              style={{ minHeight: '90px' }}
            />
          </div>

          {/* 7. Low Stock Alert Settings */}
          <div className="space-y-3 pt-3 border-t border-[#e3e2e0]">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-slate-900 block">
                  Low Stock Alert
                </label>
                <p className="text-xs text-slate-600">
                  Notify when stock falls to limit
                </p>
              </div>

              <button
                type="button"
                onClick={() => updateField('enableLowStockAlert', !formData.enableLowStockAlert)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.enableLowStockAlert ? 'bg-[#0f9d58]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    formData.enableLowStockAlert ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {formData.enableLowStockAlert && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs sm:text-sm text-slate-700 font-semibold">Alert threshold:</span>
                <input
                  type="number"
                  min="1"
                  value={formData.lowStockThreshold ?? globalLowQuantityThreshold}
                  onChange={(e) => updateField('lowStockThreshold', Math.max(1, Number(e.target.value)))}
                  className="w-20 px-3 py-1.5 rounded-xl bg-white border border-[#e3e2e0] text-center font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f9d58]"
                />
                <span className="text-xs text-slate-500">units</span>
              </div>
            )}
          </div>

          {/* 8. Email Notification Settings for Expiry & Low Qty */}
          <div className="space-y-3 pt-3 border-t border-[#e3e2e0]">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Mail size={14} className="text-slate-700" />
              Email Alert Settings
            </div>

            {/* Email for Expiry Alert */}
            <div className="flex items-center justify-between bg-white border border-[#e3e2e0] rounded-2xl p-3.5 shadow-xs">
              <div>
                <label className="text-sm font-bold text-slate-900 block">
                  Email on Expiry
                </label>
                <p className="text-xs text-slate-600">
                  Send email alert when this medicine is expiring
                </p>
              </div>

              <button
                type="button"
                onClick={() => updateField('enableEmailExpiryAlert', !formData.enableEmailExpiryAlert)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.enableEmailExpiryAlert !== false ? 'bg-[#0f9d58]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    formData.enableEmailExpiryAlert !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Email for Low Quantity Alert */}
            <div className="flex items-center justify-between bg-white border border-[#e3e2e0] rounded-2xl p-3.5 shadow-xs">
              <div>
                <label className="text-sm font-bold text-slate-900 block">
                  Email on Low Stock
                </label>
                <p className="text-xs text-slate-600">
                  Send email alert when stock reaches threshold
                </p>
              </div>

              <button
                type="button"
                onClick={() => updateField('enableEmailLowStockAlert', !formData.enableEmailLowStockAlert)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.enableEmailLowStockAlert !== false ? 'bg-[#0f9d58]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    formData.enableEmailLowStockAlert !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Add Medication Button - In-flow below email alert settings */}
          <div className="pt-2 pb-8">
            <button
              type="submit"
              disabled={isSaving || !formData.name?.trim()}
              className="w-full py-4 rounded-2xl bg-[#0f9d58] text-white font-extrabold text-base shadow-md hover:bg-[#0b7a44] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={18} />
              {isSaving ? 'Adding Medication...' : 'Add Medication'}
            </button>
          </div>

        </form>
      </main>
    </motion.div>
  );
};
