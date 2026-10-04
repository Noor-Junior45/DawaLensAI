import React, { useState } from 'react';
import { Medicine } from '../types';
import { 
  ChevronLeft, History, Pencil, Package, Clock, Calendar, 
  AlertTriangle, CheckCircle2, XCircle, Bell, BellOff, Mail,
  FileText, Settings, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MEDICINE_FORM_ICONS, MEDICINE_FORM_LABELS, getCategoryStyle } from '../constants';
import { LocalImage } from './LocalImage';
import { useEdgeSwipeBack } from '../utils/mobileGestures';
import { triggerLightHaptic, triggerSelectionHaptic } from '../utils/haptics';

interface MedicineDetailsPageProps {
  medicine: Medicine;
  allMedicines: Medicine[];
  globalLowQuantityThreshold: number;
  alertThreshold: number;
  onBack: () => void;
  onGoToHistory: () => void;
  onGoToEdit: () => void;
  onDelete?: () => void;
}

export const MedicineDetailsPage: React.FC<MedicineDetailsPageProps> = ({
  medicine,
  allMedicines,
  globalLowQuantityThreshold,
  alertThreshold,
  onBack,
  onGoToHistory,
  onGoToEdit,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const confirmDelete = () => {
    triggerLightHaptic();
    if (onDelete) {
      onDelete();
    }
    setShowDeleteConfirm(false);
  };
  // Mobile Edge-Swipe from left to navigate back
  useEdgeSwipeBack({ onBack });
  // Format dates cleanly like "27 Feb 2027"
  const formatDateFormal = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const [year, month, day] = dateStr.split('-').map(Number);
    if (year && month && day && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getDiffDays = (dateStr?: string): number => {
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
  };

  // Find all batches for this medicine (same normalized name)
  const normalizedName = medicine.name.trim().toLowerCase();
  const relatedBatches = React.useMemo(() => {
    const list = allMedicines.filter(
      m => !m.isDeleted && m.name.trim().toLowerCase() === normalizedName
    );
    return list.sort((a, b) => {
      if (a.id === medicine.id) return -1;
      if (b.id === medicine.id) return 1;
      return getDiffDays(a.expirationDate) - getDiffDays(b.expirationDate);
    });
  }, [allMedicines, normalizedName, medicine.id]);

  const batchesToShow = relatedBatches.length > 0 ? relatedBatches : [medicine];
  const totalStock = batchesToShow.reduce((acc, b) => acc + (b.quantity || 0), 0);
  const activeBatches = batchesToShow.filter(b => !b.taken && getDiffDays(b.expirationDate) >= 0);
  
  // If the user selected an expired batch, focus on that batch; otherwise focus on the nearest active batch
  const isSelectedMedicineExpired = getDiffDays(medicine.expirationDate) < 0;
  const targetBatch = isSelectedMedicineExpired ? medicine : (activeBatches.length > 0 ? activeBatches[0] : batchesToShow[0]);
  const nearestDiffDays = getDiffDays(targetBatch?.expirationDate);

  // Low stock settings
  const isAlertEnabled = medicine.enableLowStockAlert !== false;
  const alertQty = medicine.lowStockThreshold ?? globalLowQuantityThreshold;
  const isLowStock = isAlertEnabled && totalStock <= alertQty;

  // Notice calculation
  const isExpired = nearestDiffDays < 0;
  const isExpiringToday = nearestDiffDays === 0;
  const isExpiringSoon = nearestDiffDays > 0 && nearestDiffDays <= 10;
  const effectiveThreshold = alertThreshold === 90 ? 92 : alertThreshold;
  const isExpiringAlert = nearestDiffDays > 10 && nearestDiffDays <= effectiveThreshold;

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
            title="Back to medicines"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Medicine Details
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {/* Delete Button: Text Only on the left side of history button */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-2.5 py-1 text-sm font-semibold text-rose-600 hover:text-rose-700 active:scale-95 transition-all cursor-pointer mr-0.5"
            title="Delete Medicine"
          >
            Delete
          </button>

          {/* History Button: Red Sign Only (No background, No border) */}
          <button
            type="button"
            onClick={onGoToHistory}
            className="p-2 text-rose-600 hover:text-rose-700 active:scale-90 transition-transform"
            title="View History"
            aria-label="History"
          >
            <History size={20} />
          </button>

          {/* Edit Button: Dark Sign Only (No background, No border) */}
          <button
            type="button"
            onClick={onGoToEdit}
            className="p-2 text-slate-800 hover:text-black active:scale-90 transition-transform"
            title="Edit Medicine"
            aria-label="Edit"
          >
            <Pencil size={20} />
          </button>
        </div>
      </header>

      {/* Main Page Content - Spacious layout */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-5 sm:px-8 py-7 space-y-7 pb-24">
        
        {/* 1. Medicine Name & Form / Dosage */}
        <section className="space-y-2.5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight leading-tight">
              {medicine.name}
            </h2>
            {medicine.imageUrl && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-[#e3e2e0] bg-white shrink-0 shadow-sm">
                {medicine.imageUrl === 'local' ? (
                  <LocalImage medicineId={medicine.id} className="w-full h-full object-cover" />
                ) : (
                  <img src={medicine.imageUrl} alt={medicine.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-slate-800 text-sm sm:text-base font-semibold">
            <span className="flex items-center gap-1.5">
              {medicine.form && MEDICINE_FORM_ICONS[medicine.form]}
              <span className="text-slate-900">
                {medicine.form ? MEDICINE_FORM_LABELS[medicine.form] : 'Other'}
              </span>
            </span>
            <span className="text-slate-400">•</span>
            <span className="flex items-center gap-1.5 text-slate-900">
              <Package size={15} className="text-slate-600" />
              <span>{medicine.dosage || 'N/A'}</span>
            </span>
          </div>

          {/* Selected Category Display */}
          <div className="pt-2 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${getCategoryStyle(medicine.category).badgeBg} ${getCategoryStyle(medicine.category).badgeText} ${getCategoryStyle(medicine.category).badgeBorder}`}>
              <span className={`w-2 h-2 rounded-full ${getCategoryStyle(medicine.category).dotColor}`} />
              <span>{medicine.category || 'General'}</span>
            </span>
          </div>
        </section>

        <hr className="border-t border-[#e3e2e0]" />

        {/* 2. Medication Schedule */}
        <section className="space-y-1.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Clock size={14} className="text-slate-700" />
            <span>Medication Schedule</span>
          </div>
          <div className="text-base text-slate-900 font-medium">
            {medicine.schedule && medicine.schedule.trim() ? medicine.schedule : 'None'}
          </div>
        </section>

        <hr className="border-t border-[#e3e2e0]" />

        {/* 3. Usage Instructions (Card Design as requested) */}
        <section className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <FileText size={14} className="text-slate-700" />
            <span>Usage Instructions</span>
          </div>
          <div className="bg-white border border-[#e3e2e0] rounded-2xl p-4 sm:p-5 shadow-xs">
            <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
              {medicine.usageInstructions && medicine.usageInstructions.trim() 
                ? medicine.usageInstructions 
                : 'No instructions recorded.'}
            </p>
          </div>
        </section>

        <hr className="border-t border-[#e3e2e0]" />

        {/* 4. Stocks & Expiry Date (Pure direct details) */}
        <section className="space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Package size={14} className="text-slate-700" />
            <span>Stocks & Expiry Date</span>
          </div>
          
          <div className="space-y-2">
            {batchesToShow.map((batch, index) => {
              const diff = getDiffDays(batch.expirationDate);
              const isBatchExpired = diff < 0;
              const formattedDate = formatDateFormal(batch.expirationDate);
              const qty = batch.quantity !== undefined ? batch.quantity : 0;

              return (
                <div 
                  key={`detail-batch-${batch.id || 'b'}-${index}`}
                  className="flex items-center justify-between text-base py-1"
                >
                  <div className="font-semibold text-slate-900">
                    <span>Qty: <strong className="text-black">{qty}</strong></span>
                    <span className="mx-2 text-slate-400">•</span>
                    <span>Expiry Date: <strong className={isBatchExpired ? 'text-rose-600' : 'text-slate-900'}>{formattedDate}</strong></span>
                  </div>
                  {isBatchExpired && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                      Expired
                    </span>
                  )}
                </div>
              );
            })}

            {batchesToShow.length > 1 && (
              <div className="pt-1.5 text-sm font-bold text-slate-900">
                Total Stock: <span className="text-black font-extrabold">{totalStock} units</span>
              </div>
            )}
          </div>
        </section>

        <hr className="border-t border-[#e3e2e0]" />

        {/* 5. Settings Section (Direct values, no verbose explanations) */}
        <section className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Settings size={14} className="text-slate-700" />
            <span>Settings</span>
          </div>
          <div className="space-y-2 text-sm sm:text-base text-slate-900 font-medium">
            <div className="flex items-center gap-2">
              {isAlertEnabled ? (
                <Bell size={16} className="text-slate-700 shrink-0" />
              ) : (
                <BellOff size={16} className="text-slate-400 shrink-0" />
              )}
              <span>
                Low Stock Alert: <strong className="text-black">{isAlertEnabled ? `${alertQty} units` : 'Disabled'}</strong>
              </span>
            </div>

            {/* Email alerts status */}
            <div className="pt-1 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Mail size={16} className="text-slate-700 shrink-0" />
                <span>Email alerts:</span>
              </div>
              <div className="ml-7 sm:ml-8 pl-3.5 border-l-2 border-slate-200 space-y-1.5 text-sm sm:text-base text-slate-800 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                  <span>Expiry: <strong className="text-black font-bold">{medicine.enableEmailExpiryAlert !== false ? 'On' : 'Off'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                  <span>Low stock: <strong className="text-black font-bold">{medicine.enableEmailLowStockAlert !== false ? 'On' : 'Off'}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-t border-[#e3e2e0]" />

        {/* 6. Notice Area (Highlight Focus Box) */}
        <section className="pt-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center gap-1.5">
            <AlertCircle size={14} className="text-slate-700" />
            <span>Notice</span>
          </div>

          {isExpired ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex items-start gap-3 shadow-xs">
              <XCircle className="text-rose-600 shrink-0 mt-0.5" size={22} />
              <div>
                <div className="font-bold text-base text-rose-950">
                  Expired Medication Notice
                </div>
                <p className="text-sm text-rose-900 leading-snug mt-0.5">
                  {targetBatch.quantity ?? 0} units expired <strong>{Math.abs(nearestDiffDays)} days ago</strong> on {formatDateFormal(targetBatch?.expirationDate)}.
                </p>
              </div>
            </div>
          ) : isExpiringToday ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={22} />
              <div>
                <div className="font-bold text-base text-amber-950">
                  Expiring Today Notice
                </div>
                <p className="text-sm text-amber-900 leading-snug mt-0.5">
                  <strong>{targetBatch?.quantity ?? 0} unit(s)</strong> expire today ({formatDateFormal(targetBatch?.expirationDate)}).
                </p>
              </div>
            </div>
          ) : isExpiringSoon ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-orange-50 border-2 border-orange-300 text-orange-950 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="text-orange-600 shrink-0 mt-0.5" size={22} />
              <div>
                <div className="font-bold text-base text-orange-950">
                  Expiring Soon Notice
                </div>
                <p className="text-sm text-orange-900 leading-snug mt-0.5">
                  <strong>{targetBatch?.quantity ?? 0} unit(s)</strong> have <strong>{nearestDiffDays} day(s) left</strong> to expire on {formatDateFormal(targetBatch?.expirationDate)}.
                </p>
              </div>
            </div>
          ) : isExpiringAlert ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-purple-50 border-2 border-purple-200 text-purple-950 flex items-start gap-3 shadow-xs">
              <Clock className="text-purple-600 shrink-0 mt-0.5" size={22} />
              <div>
                <div className="font-bold text-base text-purple-950">
                  Upcoming Expiration Notice
                </div>
                <p className="text-sm text-purple-900 leading-snug mt-0.5">
                  <strong>{targetBatch?.quantity ?? 0} unit(s)</strong> with <strong>{nearestDiffDays} days left</strong> until {formatDateFormal(targetBatch?.expirationDate)}.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={22} />
              <div>
                <div className="font-bold text-base text-emerald-950">
                  Active Stock Notice
                </div>
                <p className="text-sm text-emerald-900 leading-snug mt-0.5">
                  <strong>{targetBatch?.quantity ?? 0} unit(s)</strong> available with <strong>{nearestDiffDays} days left</strong> until {formatDateFormal(targetBatch?.expirationDate)}.
                </p>
              </div>
            </div>
          )}

          {/* Low Stock Warning if triggered */}
          {isLowStock && !isExpired && (
            <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center gap-2.5 text-sm font-medium">
              <AlertTriangle size={18} className="text-amber-600 shrink-0" />
              <span>
                Low stock: Remaining stock ({totalStock} units) has reached or fallen below {alertQty} units.
              </span>
            </div>
          )}
        </section>

      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white border border-[#e3e2e0] rounded-3xl p-6 shadow-2xl text-center z-10"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Medicine?</h3>
              <p className="text-slate-600 text-xs mb-6">
                Are you sure you want to delete <span className="font-semibold text-slate-900">{medicine.name}</span>? You can restore it anytime from Recently Deleted.
              </p>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
