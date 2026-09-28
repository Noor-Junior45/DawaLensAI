import React, { useState, useEffect, useRef } from 'react';
import { Medicine, MedicineForm } from '../types';
import { 
  ArrowLeft, Save, Plus, Minus, Calendar, Package, Clock, 
  Sparkles, Bell, BellOff, Mail, Check, X, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MEDICINE_FORM_ICONS, MEDICINE_FORM_LABELS, MEDICINE_CATEGORIES, getCategoryStyle } from '../constants';
import { localImageStorage } from '../services/localImageStorage';
import { categorizeMedicinesWithAI } from '../services/geminiService';

interface MedicineEditPageProps {
  medicine: Medicine;
  allMedicines: Medicine[];
  globalLowQuantityThreshold: number;
  isSaving?: boolean;
  onSave: (updatedMedicine: Partial<Medicine>) => Promise<void> | void;
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

export const MedicineEditPage: React.FC<MedicineEditPageProps> = ({
  medicine,
  allMedicines,
  globalLowQuantityThreshold,
  isSaving = false,
  onSave,
  onBack
}) => {
  const [formData, setFormData] = useState<Partial<Medicine>>({
    name: medicine.name || '',
    dosage: medicine.dosage || '',
    form: medicine.form || 'tablet',
    quantity: medicine.quantity ?? 1,
    expirationDate: medicine.expirationDate || '',
    schedule: medicine.schedule || '',
    usageInstructions: medicine.usageInstructions || '',
    category: medicine.category || 'Other',
    enableLowStockAlert: medicine.enableLowStockAlert !== false,
    lowStockThreshold: medicine.lowStockThreshold ?? globalLowQuantityThreshold,
    enableEmailExpiryAlert: medicine.enableEmailExpiryAlert !== false,
    enableEmailLowStockAlert: medicine.enableEmailLowStockAlert !== false,
    imageUrl: medicine.imageUrl || '',
    capturedImage: medicine.capturedImage || ''
  });

  const [suggestions, setSuggestions] = useState<Medicine[]>([]);
  const [isGeminiCategorizing, setIsGeminiCategorizing] = useState(false);
  const [geminiNotice, setGeminiNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGeminiCategorize = async () => {
    if (isGeminiCategorizing) return;
    setIsGeminiCategorizing(true);
    setGeminiNotice(null);
    try {
      const results = await categorizeMedicinesWithAI([{
        id: medicine.id,
        name: formData.name || medicine.name,
        dosage: formData.dosage || medicine.dosage,
        usageInstructions: formData.usageInstructions || medicine.usageInstructions,
        form: formData.form || medicine.form
      }]);

      if (results && results.length > 0 && results[0]?.category) {
        const detectedCat = results[0].category;
        updateField('category', detectedCat);
        setGeminiNotice(`Category set to "${detectedCat}" by Gemini AI!`);
        setTimeout(() => setGeminiNotice(null), 4000);
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
    if (medicine.imageUrl === 'local' && !medicine.capturedImage) {
      localImageStorage.getImage(medicine.id).then((img) => {
        if (img) {
          setFormData(prev => ({ ...prev, capturedImage: img }));
        }
      }).catch(() => {});
    }
  }, [medicine]);

  const updateField = (field: keyof Medicine, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNameChange = (name: string) => {
    updateField('name', name);

    if (name.length > 1) {
      const filtered = allMedicines.filter(m => 
        m.name.toLowerCase().includes(name.toLowerCase()) && 
        m.id !== medicine.id
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
    onSave(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-0 z-50 bg-[#faf8f5] overflow-y-auto flex flex-col text-[#1f1f1f]"
    >
      {/* Top Header - Save button REMOVED from header as requested */}
      <header className="sticky top-0 z-20 bg-[#faf8f5]/95 backdrop-blur-md border-b border-[#e3e2e0] px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 rounded-full text-slate-800 hover:text-black hover:bg-black/5 active:scale-95 transition-all"
            title="Back to Details"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Edit Medicine
          </h1>
        </div>
      </header>

      {/* Main Edit Form - Optimized for Phone Screens */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <form onSubmit={handleSubmit} className="space-y-6">

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
                    key={`edit-sug-${s.id || s.name}-${sIdx}`}
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

          {/* 2. Medicine Form Switcher - Mobile friendly 2-col or 4-col grid */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
              Medicine Form
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FORM_OPTIONS.map((formKey) => {
                const isSelected = formData.form === formKey;
                return (
                  <button
                    key={formKey}
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

          {/* Category Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                  Category
                </label>
                <span className="text-[11px] text-slate-500 font-normal lowercase">e.g. Heart, Vitamins, Pain Relief</span>
              </div>
              <button
                type="button"
                onClick={handleGeminiCategorize}
                disabled={isGeminiCategorizing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all active:scale-95 disabled:opacity-50 shadow-2xs"
                title="Let Gemini AI detect the best category for this medicine"
              >
                {isGeminiCategorizing ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-indigo-600" />
                    <span>Detecting with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-indigo-600" />
                    <span>Gemini Category</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Feedback Notice */}
            <AnimatePresence>
              {geminiNotice && (
                <motion.div
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
                    className="text-emerald-600 hover:text-emerald-900"
                  >
                    <X size={13} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {MEDICINE_CATEGORIES.map(catKey => {
                const isSelected = (formData.category || 'Other').toLowerCase() === catKey.toLowerCase();
                const style = getCategoryStyle(catKey);
                return (
                  <button
                    key={`edit-cat-${catKey}`}
                    type="button"
                    onClick={() => updateField('category', catKey)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all text-left ${
                      isSelected
                        ? `${style.badgeBg} ${style.badgeText} border-current ring-1 ring-current shadow-xs`
                        : 'bg-white border-[#e3e2e0] text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${style.dotColor}`} />
                    <span className="truncate">{catKey}</span>
                  </button>
                );
              })}
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
              {SCHEDULE_PRESETS.map((preset) => (
                <button
                  key={preset}
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

          {/* 6. Usage Instructions - Auto Expandable according to text length (No scrollbar) */}
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

          {/* 8. Email Notification Settings for Expiry & Low Qty (As requested) */}
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

          {/* Save Medication Button - In-flow below email alert settings */}
          <div className="pt-2 pb-8">
            <button
              type="submit"
              disabled={isSaving || !formData.name?.trim()}
              className="w-full py-4 rounded-2xl bg-[#0f9d58] text-white font-extrabold text-base shadow-md hover:bg-[#0b7a44] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save size={18} />
              {isSaving ? 'Saving Changes...' : 'Save Medication'}
            </button>
          </div>

        </form>
      </main>
    </motion.div>
  );
};
