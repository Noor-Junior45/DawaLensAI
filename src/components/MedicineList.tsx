import React, { useState } from 'react';
import { Medicine } from '../types';
import { Calendar, Package, ChevronRight, AlertCircle, CheckCircle2, Pill, AlertTriangle, XCircle, Clock, Trash2, CheckSquare, Square, Minus, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MEDICINE_FORM_ICONS } from '../constants';

interface MedicineListProps {
  medicines: Medicine[];
  onEdit: (medicine: Medicine) => void;
  onToggleTaken: (medicine: Medicine) => void;
  onReduceQuantity: (medicine: Medicine) => void;
  onDeleteMultiple: (ids: string[]) => void;
  lowQuantityThreshold: number;
  alertThreshold: number;
  onToggleLike?: (medicine: Medicine) => void;
}

export const MedicineList: React.FC<MedicineListProps> = ({ medicines, onEdit, onToggleTaken, onReduceQuantity, onDeleteMultiple, lowQuantityThreshold, alertThreshold, onToggleLike }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    if (newSelected.size === 0) {
      setIsSelectionMode(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === medicines.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(medicines.map(m => m.id)));
      setIsSelectionMode(true);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDeleteMultiple(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setShowDeleteConfirm(false);
  };

  const getExpiryStatus = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const expiry = new Date();
    if (year && month && day) {
      expiry.setFullYear(year, month - 1, day);
    } else {
      return { label: 'Invalid Date', color: 'text-slate-500', bg: 'bg-slate-100', Icon: Clock };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    const effectiveThreshold = alertThreshold === 90 ? 92 : alertThreshold;
    
    if (diffDays < 0) return { label: 'Expired', color: 'text-[#ea4335]', bg: 'bg-rose-50 border border-rose-100', Icon: XCircle };
    if (diffDays === 0) return { label: 'Expiring Today', color: 'text-[#f2a154]', bg: 'bg-amber-50 border border-amber-100', Icon: AlertTriangle };
    if (diffDays <= 10) return { label: 'Expiring Soon (10d)', color: 'text-[#f2a154]', bg: 'bg-amber-50 border border-amber-100', Icon: AlertTriangle };
    if (diffDays <= effectiveThreshold) {
      const label = alertThreshold === 90 ? 'Expiring in 3mo' : `Expiring in ${alertThreshold}d`;
      return { label, color: 'text-[#ab47bc]', bg: 'bg-purple-50 border border-purple-100', Icon: Clock };
    }
    if (diffDays <= 180) return { label: 'Expiring in 6mo', color: 'text-[#1a73e8]', bg: 'bg-blue-50 border border-blue-100', Icon: Clock };
    return { label: 'Safe', color: 'text-[#0f9d58]', bg: 'bg-emerald-50 border border-emerald-100', Icon: CheckCircle2 };
  };

  const checkIsExpiredOrEmpty = (med: Medicine) => {
    const isEmpty = med.quantity !== undefined && med.quantity <= 0;
    const isTaken = med.taken === true;
    if (isEmpty || isTaken) return true;

    if (!med.expirationDate) return false;

    const [year, month, day] = med.expirationDate.split('-').map(Number);
    const expiry = new Date();
    if (year && month && day && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
      expiry.setFullYear(year, month - 1, day);
    } else {
      // Fallback date parser
      const parsedDate = new Date(med.expirationDate);
      if (!isNaN(parsedDate.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        parsedDate.setHours(0, 0, 0, 0);
        return parsedDate.getTime() < today.getTime();
      }
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays < 0;
  };

  const safeMedicines = medicines.filter(med => !checkIsExpiredOrEmpty(med));
  const expiredOrEmptyMedicines = medicines.filter(med => checkIsExpiredOrEmpty(med));

  const renderMedicineItem = (med: Medicine, index: number) => {
    const status = getExpiryStatus(med.expirationDate);
    const [year, month, day] = med.expirationDate.split('-').map(Number);
    const expiry = new Date();
    if (year && month && day) {
      expiry.setFullYear(year, month - 1, day);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const effectiveThreshold = alertThreshold === 90 ? 92 : alertThreshold;
    const isExpired = diffDays < 0;
    const isExpiringSoon = diffDays >= 0 && diffDays <= 10;
    const isExpiringAlert = diffDays > 10 && diffDays <= effectiveThreshold;
    const isLowQuantity = med.quantity !== undefined && med.quantity <= lowQuantityThreshold;
    const needsAttention = !med.taken && (isExpired || isExpiringSoon || isExpiringAlert || isLowQuantity);
    const isSelected = selectedIds.has(med.id);

    return (
      <motion.div
        layout
        key={med.id}
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ 
          opacity: med.taken ? 0.5 : 1, 
          scale: 1,
          y: 0,
          ...(needsAttention && !isSelected ? {
            boxShadow: isExpired 
              ? ['0px 0px 0px rgba(239,68,68,0)', '0px 0px 15px rgba(239,68,68,0.15)', '0px 0px 0px rgba(239,68,68,0)']
              : isExpiringSoon 
                ? ['0px 0px 0px rgba(249,115,22,0)', '0px 0px 15px rgba(249,115,22,0.15)', '0px 0px 0px rgba(249,115,22,0)']
                : isExpiringAlert || isLowQuantity
                  ? ['0px 0px 0px rgba(234,179,8,0)', '0px 0px 15px rgba(234,179,8,0.15)', '0px 0px 0px rgba(234,179,8,0)']
                  : undefined,
          } : {}),
          transition: {
            layout: { type: "spring", stiffness: 350, damping: 30 },
            duration: 0.25
          }
        }}
        exit={{ 
          opacity: 0, 
          scale: 0.94, 
          y: -15,
          transition: { duration: 0.2 }
        }}
        transition={{ 
          delay: index * 0.03,
          ...(needsAttention && !isSelected ? {
            boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" }
          } : {})
        }}
        onClick={() => {
          if (isSelectionMode) {
            toggleSelection(med.id);
          } else if (!med.taken) {
            onEdit(med);
          }
        }}
        className={`w-full text-left group relative overflow-hidden border-2 rounded-3xl p-5 transition-all ${
          isSelectionMode ? 'cursor-pointer' : ''
        } ${
          isSelected ? 'bg-white border-[#0f9d58] shadow-[0_12px_40px_rgba(15,157,88,0.06)]' :
          med.taken ? 'bg-[#faf8f5] border-slate-300 opacity-60' :
          isExpired ? 'bg-white border-red-500 hover:border-red-600 hover:bg-red-50 shadow-sm' :
          isExpiringSoon ? 'bg-white border-orange-500 hover:border-orange-600 hover:bg-orange-50 shadow-sm' :
          isExpiringAlert ? 'bg-white border-purple-500 hover:border-purple-600 hover:bg-purple-50 shadow-sm' :
          isLowQuantity ? 'bg-white border-amber-500 hover:border-amber-600 hover:bg-amber-50 shadow-sm' :
          'bg-white border-blue-400 hover:border-blue-500 hover:bg-blue-50/30 shadow-sm'
        }`}
      >
        {med.imageUrl && (
          <div className="absolute top-0 right-0 w-24 h-24 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
            <img 
              src={med.imageUrl} 
              alt="" 
              className="w-full h-full object-cover rounded-bl-3xl"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-start gap-2.5 flex-1 overflow-hidden">
            {isSelectionMode && (
              <div className="mt-1 text-slate-400 shrink-0">
                {isSelected ? <CheckSquare size={18} className="text-[#0f9d58]" /> : <Square size={18} />}
              </div>
            )}
            <div className={`flex-1 min-w-0 ${med.taken && !isSelectionMode ? 'cursor-default' : 'cursor-pointer'}`}>
              <h3 className={`font-bold text-base sm:text-lg tracking-tight transition-colors flex items-center gap-1.5 ${med.taken ? 'text-slate-400 line-through' : 'text-[#1f1f1f] group-hover:text-[#0f9d58]'}`}>
                <span className="truncate">{med.name}</span>
                <span className="shrink-0 scale-90 sm:scale-100">{med.form && MEDICINE_FORM_ICONS[med.form]}</span>
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-slate-500 text-[11px] sm:text-xs">
                  <Package size={12} className="text-slate-400" />
                  {med.dosage}
                </span>
                {med.schedule && (
                  <span className="flex items-center gap-1 text-[#1a73e8] text-[11px] sm:text-xs font-semibold">
                    <Clock size={12} className="text-[#1a73e8]" />
                    <span className="truncate max-w-[120px]">{med.schedule}</span>
                  </span>
                )}
                {!med.taken && (
                  <span className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                    {status.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          {!isSelectionMode && (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Bookmark heart button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike && onToggleLike(med);
                }}
                className={`p-2 sm:p-2.5 rounded-full transition-all active:scale-90 border ${
                  med.liked 
                    ? 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100' 
                    : 'bg-[#faf8f5]/60 text-slate-400 border-[#e3e2e0] hover:text-slate-600 hover:bg-slate-100'
                }`}
                title={med.liked ? "Remove like" : "Like medication"}
              >
                <Heart size={16} fill={med.liked ? "#ef4444" : "none"} />
              </button>

              {!med.taken && med.quantity !== undefined && med.quantity > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReduceQuantity(med);
                  }}
                  className="p-2 sm:p-2.5 bg-[#faf8f5]/60 border border-[#e3e2e0] rounded-full text-slate-500 hover:text-[#1f1f1f] hover:bg-slate-100 transition-all active:scale-90"
                  title="Reduce quantity"
                >
                  <Minus size={16} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTaken(med);
                }}
                className={`p-2 sm:p-2.5 border rounded-full transition-all active:scale-90 ${
                  med.taken 
                    ? 'bg-emerald-50 text-[#0f9d58] border-emerald-100 hover:bg-emerald-100/50' 
                    : 'bg-[#faf8f5]/60 text-slate-500 border-[#e3e2e0] hover:bg-slate-100 hover:text-[#1f1f1f]'
                }`}
                title={med.taken ? "Mark as not taken" : "Mark as taken"}
              >
                <CheckCircle2 size={16} />
              </button>
            </div>
          )}
        </div>
        
        <div className={`flex items-center justify-between mt-2 pt-2 border-t border-slate-100 ${isSelectionMode ? 'ml-7' : ''}`}>
          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-mono font-medium">
            <Calendar size={12} className="text-slate-400" />
            <span>EXP: {expiry.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
          
          {!med.taken && med.quantity !== undefined && (
            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isLowQuantity ? 'text-[#f2a154] bg-orange-50 border border-orange-100' : 'text-slate-500 bg-slate-50 border border-slate-150'}`}>
              {med.quantity} LEFT
            </div>
          )}
        </div>

        {med.usageInstructions && !med.taken && (
          <p className={`mt-2 text-slate-500 text-[10px] line-clamp-1 italic ${isSelectionMode ? 'ml-7' : ''}`}>
            {med.usageInstructions}
          </p>
        )}
      </motion.div>
    );
  };

  if (medicines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 border border-[#e3e2e0] shadow-sm">
          <Package className="text-slate-400" size={32} />
        </div>
        <h3 className="text-[#1f1f1f] font-semibold text-lg mb-2">No medicines tracked</h3>
        <p className="text-[#5f6368] text-sm max-w-[240px]">
          Start by scanning a medicine label or adding one manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-2 sm:px-4 pb-24">
      <div className="flex justify-between items-center mb-3 px-2">
        <button 
          onClick={() => {
            if (isSelectionMode) {
              setIsSelectionMode(false);
              setSelectedIds(new Set());
            } else {
              setIsSelectionMode(true);
            }
          }}
          className="text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
        >
          {isSelectionMode ? 'Cancel Selection' : 'Select Multiple'}
        </button>
        
        <AnimatePresence>
          {isSelectionMode && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-3"
            >
              <button 
                onClick={toggleSelectAll}
                className="text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors flex items-center gap-1.5"
              >
                {selectedIds.size === medicines.length ? <CheckSquare size={16} className="text-[#0f9d58]" /> : <Square size={16} />}
                All
              </button>
              {selectedIds.size > 0 && (
                <button 
                  onClick={handleDeleteSelected}
                  className="text-sm text-red-600 hover:text-red-700 transition-colors flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 font-semibold"
                >
                  <Trash2 size={14} />
                  Delete ({selectedIds.size})
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {safeMedicines.length > 0 && expiredOrEmptyMedicines.length > 0 && (
        <div className="flex items-center gap-2 mt-4 mb-2.5 px-2 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0f9d58]" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Active & Safe ({safeMedicines.length})
          </span>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {safeMedicines.map((med, index) => renderMedicineItem(med, index))}
      </AnimatePresence>

      {expiredOrEmptyMedicines.length > 0 && (
        <div className="flex items-center gap-2 mt-6 mb-2.5 px-2 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ea4335]" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Expired, Empty, or Finished Stock ({expiredOrEmptyMedicines.length})
          </span>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {expiredOrEmptyMedicines.map((med, index) => renderMedicineItem(med, index))}
      </AnimatePresence>

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
              className="relative w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 mx-auto">
                <Trash2 className="text-red-500" size={24} />
              </div>
              <h3 className="text-xl font-medium text-white text-center mb-2">Delete Medicines?</h3>
              <p className="text-white/60 text-sm text-center mb-6">
                Are you sure you want to delete {selectedIds.size} selected medicine(s)? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
