import React, { useState } from 'react';
import { Medicine, MedicineForm } from '../types';
import { 
  Calendar, Package, AlertTriangle, CheckCircle2, Clock, Trash2, 
  CheckSquare, Square, Minus, Heart, Layers, Edit3, XCircle, AlertCircle, 
  ChevronDown, ChevronUp, Sparkles, Filter, RefreshCw, X, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MEDICINE_FORM_ICONS, getCategoryStyle, isCategoryMatch, getMedicineCategories } from '../constants';
import { LocalImage } from './LocalImage';
import { triggerLightHaptic, triggerMediumHaptic, triggerSelectionHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface MedicineListProps {
  medicines: Medicine[];
  onEdit: (medicine: Medicine) => void;
  onToggleTaken: (medicine: Medicine) => void;
  onReduceQuantity: (medicine: Medicine) => void;
  onDeleteMultiple: (ids: string[]) => void;
  lowQuantityThreshold: number;
  alertThreshold: number;
  onToggleLike?: (medicine: Medicine) => void;
  onAutoCategorize?: () => Promise<void>;
  isCategorizing?: boolean;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  isSelectionMode?: boolean;
  setIsSelectionMode?: React.Dispatch<React.SetStateAction<boolean>>;
  selectedIds?: Set<string>;
  setSelectedIds?: React.Dispatch<React.SetStateAction<Set<string>>>;
  totalMedicinesCount?: number;
  sortOrder?: 'default' | 'asc' | 'desc';
}

interface GroupedMedicine {
  groupKey: string;
  name: string;
  form?: MedicineForm;
  dosage: string;
  schedule?: string;
  usageInstructions?: string;
  imageUrl?: string;
  liked?: boolean;
  category?: string;
  categories?: string[];
  tags: string[];
  enableLowStockAlert?: boolean;
  lowStockThreshold?: number;
  activeBatches: Medicine[];
  expiredOrEmptyBatches: Medicine[];
  totalActiveQuantity: number;
  totalExpiredQuantity: number;
  hasActiveQuantities: boolean;
  hasExpiredQuantities: boolean;
  nearestActiveBatch?: Medicine;
  earliestExpiredBatch?: Medicine;
  allBatches: Medicine[];
}

export const MedicineList: React.FC<MedicineListProps> = ({ 
  medicines, onEdit, onToggleTaken, onReduceQuantity, onDeleteMultiple, 
  lowQuantityThreshold, alertThreshold, onToggleLike, onAutoCategorize, isCategorizing = false,
  selectedCategory = 'ALL', onSelectCategory,
  isSelectionMode: propIsSelectionMode,
  setIsSelectionMode: propSetIsSelectionMode,
  selectedIds: propSelectedIds,
  setSelectedIds: propSetSelectedIds,
  totalMedicinesCount = 0,
  sortOrder = 'default'
}) => {
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const [internalIsSelectionMode, setInternalIsSelectionMode] = useState(false);

  const selectedIds = propSelectedIds !== undefined ? propSelectedIds : internalSelectedIds;
  const setSelectedIds = propSetSelectedIds !== undefined ? propSetSelectedIds : setInternalSelectedIds;
  const isSelectionMode = propIsSelectionMode !== undefined ? propIsSelectionMode : internalIsSelectionMode;
  const setIsSelectionMode = propSetIsSelectionMode !== undefined ? propSetIsSelectionMode : setInternalIsSelectionMode;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('dawasnap_hide_organize_banner') === 'true' ||
             sessionStorage.getItem('dawalens_hide_organize_banner') === 'true' ||
             localStorage.getItem('dawasnap_medicines_organized') === 'true' ||
             localStorage.getItem('dawalens_medicines_organized') === 'true';
    } catch {
      return false;
    }
  });

  const toggleGroupExpanded = (groupKey: string) => {
    setExpandedGroupKeys(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

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

  const toggleSelectGroup = (groupBatches: Medicine[]) => {
    const groupIds = groupBatches.map(b => b.id);
    const allSelected = groupIds.every(id => selectedIds.has(id));
    const newSelected = new Set(selectedIds);

    if (allSelected) {
      groupIds.forEach(id => newSelected.delete(id));
    } else {
      groupIds.forEach(id => newSelected.add(id));
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

  const getExpiryStatus = (dateStr?: string) => {
    if (!dateStr) {
      return { label: 'No Date', color: 'text-slate-500', bg: 'bg-slate-100', Icon: Clock };
    }
    const diffDays = getDiffDays(dateStr);
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

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const [year, month, day] = dateStr.split('-').map(Number);
    if (year && month && day && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Group medicines by normalized name
  const groupedMedicinesMap = React.useMemo(() => {
    const map = new Map<string, GroupedMedicine>();

    medicines.forEach((med, medIdx) => {
      const rawName = (med.name || '').trim().toLowerCase();
      const groupKey = rawName || `med-${med.id || medIdx}`;
      const diffDays = getDiffDays(med.expirationDate);
      const isExpired = diffDays < 0;
      const isEmpty = med.quantity !== undefined && med.quantity <= 0;
      const isTaken = med.taken === true;
      const isInactive = isExpired || isEmpty || isTaken;

      let group = map.get(groupKey);
      if (!group) {
        group = {
          groupKey,
          name: (med.name || 'Unnamed Medicine').trim(),
          form: med.form,
          dosage: med.dosage,
          schedule: med.schedule,
          usageInstructions: med.usageInstructions,
          imageUrl: med.imageUrl,
          liked: med.liked,
          category: med.category,
          tags: Array.isArray(med.tags) ? [...med.tags] : [],
          enableLowStockAlert: med.enableLowStockAlert,
          lowStockThreshold: med.lowStockThreshold,
          activeBatches: [],
          expiredOrEmptyBatches: [],
          totalActiveQuantity: 0,
          totalExpiredQuantity: 0,
          hasActiveQuantities: false,
          hasExpiredQuantities: false,
          allBatches: []
        };
        map.set(groupKey, group);
      }

      group.allBatches.push(med);
      if (med.liked) group.liked = true;
      if (!group.form && med.form) group.form = med.form;
      if (!group.schedule && med.schedule) group.schedule = med.schedule;
      if (!group.usageInstructions && med.usageInstructions) group.usageInstructions = med.usageInstructions;
      if (!group.imageUrl && med.imageUrl) group.imageUrl = med.imageUrl;

      // Inherit and collect all categories and tags across batches for this medication group
      if (!group.categories) group.categories = [];
      const medCats = getMedicineCategories(med);
      medCats.forEach(c => {
        if (!group.categories!.includes(c)) {
          group.categories!.push(c);
        }
      });
      group.category = group.categories.join(', ');

      if (med.tags && Array.isArray(med.tags)) {
        med.tags.forEach(t => {
          const clean = t.trim();
          if (clean && !group.tags.includes(clean)) {
            group.tags.push(clean);
          }
        });
      }

      // Group alert settings: if any batch explicitly has disabled/enabled
      if (med.enableLowStockAlert !== undefined) {
        group.enableLowStockAlert = med.enableLowStockAlert;
      }
      if (med.lowStockThreshold !== undefined) {
        group.lowStockThreshold = med.lowStockThreshold;
      }

      if (isInactive) {
        group.expiredOrEmptyBatches.push(med);
        if (med.quantity !== undefined) {
          group.totalExpiredQuantity += Math.max(0, med.quantity);
          group.hasExpiredQuantities = true;
        }
      } else {
        group.activeBatches.push(med);
        if (med.quantity !== undefined) {
          group.totalActiveQuantity += Math.max(0, med.quantity);
          group.hasActiveQuantities = true;
        }
      }
    });

    // Sort batches within each group
    map.forEach(group => {
      // Sort active batches by nearest expiration date (ascending diffDays: nearest expiring first)
      group.activeBatches.sort((a, b) => getDiffDays(a.expirationDate) - getDiffDays(b.expirationDate));

      // In expiredOrEmptyBatches: separate genuinely expired (diffDays < 0) from empty/inactive
      const genuinelyExpired = group.expiredOrEmptyBatches.filter(b => getDiffDays(b.expirationDate) < 0);
      const otherInactive = group.expiredOrEmptyBatches.filter(b => getDiffDays(b.expirationDate) >= 0);

      // Sort expired batches so the most relevant expired batch comes first
      genuinelyExpired.sort((a, b) => getDiffDays(a.expirationDate) - getDiffDays(b.expirationDate));
      otherInactive.sort((a, b) => getDiffDays(a.expirationDate) - getDiffDays(b.expirationDate));

      group.expiredOrEmptyBatches = [...genuinelyExpired, ...otherInactive];

      if (group.activeBatches.length > 0) {
        group.nearestActiveBatch = group.activeBatches[0];
      }
      if (group.expiredOrEmptyBatches.length > 0) {
        group.earliestExpiredBatch = group.expiredOrEmptyBatches[0];
      }
    });

    return map;
  }, [medicines]);

  // Count of medicines needing organization (medicines missing category or explicitly uncategorized)
  const uncategorizedCount = React.useMemo(() => {
    return medicines.filter(m => !m.isDeleted && (
      !m.category ||
      m.category.trim() === '' ||
      m.category.toLowerCase() === 'uncategorized'
    )).length;
  }, [medicines]);

  // Filter matcher for groups using universal canonical isCategoryMatch
  const matchesFilter = (group: GroupedMedicine) => {
    if (selectedCategory !== 'ALL') {
      return isCategoryMatch(group, selectedCategory);
    }
    return true;
  };

  // Separate active groups and expired groups with filtering applied
  // If a medicine has both safe and expired batches, show safe in activeGroups and expired in expiredGroups
  const activeGroups = Array.from(groupedMedicinesMap.values())
    .filter(g => g.activeBatches.length > 0)
    .filter(matchesFilter)
    .sort((a, b) => {
      if (a.liked && !b.liked) return -1;
      if (!a.liked && b.liked) return 1;

      // When A-Z or Z-A is active, sort alphabetically by medicine name
      if (sortOrder === 'asc') {
        return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
      }
      if (sortOrder === 'desc') {
        return (b.name || '').toLowerCase().localeCompare((a.name || '').toLowerCase());
      }

      // Default: sort by nearest active expiration date
      const diffA = a.nearestActiveBatch ? getDiffDays(a.nearestActiveBatch.expirationDate) : 9999;
      const diffB = b.nearestActiveBatch ? getDiffDays(b.nearestActiveBatch.expirationDate) : 9999;
      return diffA - diffB;
    });

  const expiredGroups = Array.from(groupedMedicinesMap.values())
    .filter(g => g.expiredOrEmptyBatches.length > 0)
    .filter(matchesFilter)
    .sort((a, b) => {
      if (a.liked && !b.liked) return -1;
      if (!a.liked && b.liked) return 1;

      if (sortOrder === 'desc') {
        return (b.name || '').toLowerCase().localeCompare((a.name || '').toLowerCase());
      }
      return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
    });

  // Render an Active Group Card
  const renderActiveGroupCard = (group: GroupedMedicine, index: number) => {
    const nearestBatch = group.nearestActiveBatch;
    const nearestExpiry = nearestBatch?.expirationDate;
    const status = getExpiryStatus(nearestExpiry);
    const diffDays = getDiffDays(nearestExpiry);

    const effectiveThreshold = alertThreshold === 90 ? 92 : alertThreshold;
    const isExpiringSoon = diffDays >= 0 && diffDays <= 10;
    const isExpiringAlert = diffDays > 10 && diffDays <= effectiveThreshold;
    const isAlertEnabled = group.enableLowStockAlert !== false;
    const threshold = group.lowStockThreshold ?? lowQuantityThreshold;
    const isLowQuantity = isAlertEnabled && group.hasActiveQuantities && group.totalActiveQuantity <= threshold;
    const needsAttention = isExpiringSoon || isExpiringAlert || isLowQuantity;

    const activeBatchIds = group.activeBatches.map(b => b.id);
    const allActiveSelected = activeBatchIds.length > 0 && activeBatchIds.every(id => selectedIds.has(id));
    const isExpanded = expandedGroupKeys.has(group.groupKey) || group.allBatches.length > 1;

    return (
      <motion.div
        layout
        key={`active-group-${group.groupKey}`}
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          ...(needsAttention && !allActiveSelected ? {
            boxShadow: isExpiringSoon 
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
          ...(needsAttention && !allActiveSelected ? {
            boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" }
          } : {})
        }}
        className={`w-full text-left relative overflow-hidden border-2 rounded-3xl p-5 transition-all shadow-sm ${
          allActiveSelected ? 'bg-white border-[#0f9d58] shadow-[0_12px_40px_rgba(15,157,88,0.06)]' :
          isExpiringSoon ? 'bg-white border-orange-500 hover:border-orange-600 hover:bg-orange-50/20' :
          isExpiringAlert ? 'bg-white border-purple-500 hover:border-purple-600 hover:bg-purple-50/20' :
          isLowQuantity ? 'bg-white border-amber-500 hover:border-amber-600 hover:bg-amber-50/20' :
          'bg-white border-blue-400 hover:border-blue-500 hover:bg-blue-50/20'
        }`}
        drag={isSelectionMode ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.22}
        onDragEnd={(_, info) => {
          if (info.offset.x > 75 && nearestBatch && nearestBatch.quantity !== undefined && nearestBatch.quantity > 0) {
            triggerSuccessHaptic();
            onReduceQuantity(nearestBatch);
          } else if (info.offset.x < -75 && nearestBatch) {
            triggerLightHaptic();
            onEdit(nearestBatch);
          }
        }}
      >
        {/* Background Image if available */}
        {group.imageUrl && (
          <div className="absolute top-0 right-0 w-24 h-24 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
            {group.imageUrl === 'local' && nearestBatch ? (
              <LocalImage 
                medicineId={nearestBatch.id} 
                className="w-full h-full object-cover rounded-bl-3xl" 
              />
            ) : (
              <img 
                src={group.imageUrl} 
                alt="" 
                className="w-full h-full object-cover rounded-bl-3xl"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        )}

        {/* Card Header (Outside of the box) */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-start gap-2.5 flex-1 overflow-hidden">
            {isSelectionMode && (
              <button 
                type="button"
                onClick={() => toggleSelectGroup(group.activeBatches)}
                className="mt-1 text-slate-400 shrink-0 hover:text-[#0f9d58] transition-colors"
              >
                {allActiveSelected ? <CheckSquare size={18} className="text-[#0f9d58]" /> : <Square size={18} />}
              </button>
            )}
            
            <div 
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => {
                triggerLightHaptic();
                if (isSelectionMode) {
                  toggleSelectGroup(group.activeBatches);
                } else if (nearestBatch) {
                  onEdit(nearestBatch);
                }
              }}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg tracking-tight text-[#1f1f1f] hover:text-[#0f9d58] transition-colors truncate">
                  {group.name}
                </h3>
                <span className="shrink-0 scale-90 sm:scale-100">{group.form && MEDICINE_FORM_ICONS[group.form]}</span>
                {group.activeBatches.length > 1 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                    <Layers size={10} />
                    {group.activeBatches.length} Batches
                  </span>
                )}
                {group.expiredOrEmptyBatches.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                    <XCircle size={10} />
                    {group.expiredOrEmptyBatches.length} Expired
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-slate-500 text-[11px] sm:text-xs">
                  <Package size={12} className="text-slate-400" />
                  {group.dosage}
                </span>
                {group.schedule && (
                  <span className="flex items-center gap-1 text-[#1a73e8] text-[11px] sm:text-xs font-semibold">
                    <Clock size={12} className="text-[#1a73e8]" />
                    <span className="truncate max-w-[120px]">{group.schedule}</span>
                  </span>
                )}
                <span className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                  {status.label}
                </span>
              </div>

              {/* Category Badges (Supports multiple categories e.g. Fever & Pain Relief) */}
              {(() => {
                const cats = Array.from(new Set(getMedicineCategories(group)));
                if (cats.length === 0) return null;
                return (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {cats.map((cat, cIdx) => {
                      const style = getCategoryStyle(cat);
                      const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                      return (
                        <span 
                          key={`cat-${group.groupKey}-${cat.toLowerCase()}-${cIdx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectCategory) {
                              onSelectCategory(isSelected ? 'ALL' : cat);
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer hover:opacity-90 ${style.badgeBg} ${style.badgeText} ${style.badgeBorder} ${isSelected ? 'ring-1 ring-current' : ''}`}
                          title={`Filter by category: ${cat}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dotColor}`} />
                          {cat}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {!isSelectionMode && (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Like / Bookmark button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerLightHaptic();
                  if (nearestBatch && onToggleLike) {
                    onToggleLike(nearestBatch);
                  }
                }}
                className={`p-2 sm:p-2.5 rounded-full transition-all active:scale-90 border ${
                  group.liked 
                    ? 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100' 
                    : 'bg-[#faf8f5]/60 text-slate-400 border-[#e3e2e0] hover:text-slate-600 hover:bg-slate-100'
                }`}
                title={group.liked ? "Remove like" : "Like medication"}
              >
                <Heart size={16} fill={group.liked ? "#ef4444" : "none"} />
              </button>

              {/* Quick Reduce (-1) on nearest expiring batch */}
              {nearestBatch && nearestBatch.quantity !== undefined && nearestBatch.quantity > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerMediumHaptic();
                    onReduceQuantity(nearestBatch);
                  }}
                  className="p-2 sm:p-2.5 bg-[#faf8f5]/60 border border-[#e3e2e0] rounded-full text-slate-500 hover:text-[#1f1f1f] hover:bg-slate-100 transition-all active:scale-90"
                  title="Take / Reduce 1 from nearest expiring batch"
                >
                  <Minus size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Outside Information Bar: Nearest Expiration & Total Active Quantity */}
        <div className={`flex items-center justify-between mt-2 pt-2 border-t border-slate-100 ${isSelectionMode ? 'ml-7' : ''}`}>
          <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-mono font-semibold">
            <Calendar size={13} className="text-slate-400" />
            <span>
              Nearest Expiry: <span className="font-bold text-[#1f1f1f]">{formatDisplayDate(nearestExpiry)}</span>
            </span>
          </div>

          {group.hasActiveQuantities && (
            <div className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
              isLowQuantity 
                ? 'text-[#f2a154] bg-orange-50 border border-orange-100' 
                : 'text-slate-700 bg-slate-100 border border-slate-200'
            }`}>
              {isLowQuantity && <AlertCircle size={10} className="text-orange-500" />}
              <span>{group.totalActiveQuantity} LEFT</span>
            </div>
          )}
        </div>

        {/* Usage Instructions if present */}
        {group.usageInstructions && (
          <p className={`mt-2 text-slate-500 text-[10px] line-clamp-1 italic ${isSelectionMode ? 'ml-7' : ''}`}>
            {group.usageInstructions}
          </p>
        )}
      </motion.div>
    );
  };

  // Render an Expired Group Card (Shown in Expired Section)
  const renderExpiredGroupCard = (group: GroupedMedicine, index: number) => {
    const earliestBatch = group.earliestExpiredBatch || group.expiredOrEmptyBatches[0];
    const groupBatchIds = group.expiredOrEmptyBatches.map(b => b.id);
    const allGroupSelected = groupBatchIds.length > 0 && groupBatchIds.every(id => selectedIds.has(id));

    return (
      <motion.div
        layout
        key={`expired-group-${group.groupKey}`}
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ 
          opacity: 0.85, 
          scale: 1,
          y: 0,
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
        transition={{ delay: index * 0.03 }}
        className={`w-full text-left relative overflow-hidden border-2 rounded-3xl p-5 transition-all bg-white border-red-400 hover:border-red-500 shadow-sm ${
          allGroupSelected ? 'bg-red-50/50 border-red-500' : ''
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-start gap-2.5 flex-1 overflow-hidden">
            {isSelectionMode && (
              <button 
                type="button"
                onClick={() => toggleSelectGroup(group.expiredOrEmptyBatches)}
                className="mt-1 text-slate-400 shrink-0 hover:text-red-500 transition-colors"
              >
                {allGroupSelected ? <CheckSquare size={18} className="text-red-500" /> : <Square size={18} />}
              </button>
            )}
            
            <div 
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => {
                if (isSelectionMode) {
                  toggleSelectGroup(group.expiredOrEmptyBatches);
                } else if (earliestBatch) {
                  onEdit(earliestBatch);
                }
              }}
            >
              <h3 className="font-bold text-base sm:text-lg tracking-tight text-slate-600 flex items-center gap-1.5 truncate">
                <span className="line-through">{group.name}</span>
                <span className="shrink-0 scale-90 sm:scale-100">{group.form && MEDICINE_FORM_ICONS[group.form]}</span>
                {group.expiredOrEmptyBatches.length > 1 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                    <Layers size={10} />
                    {group.expiredOrEmptyBatches.length} Expired Batches
                  </span>
                )}
              </h3>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-slate-500 text-[11px] sm:text-xs">
                  <Package size={12} className="text-slate-400" />
                  {group.dosage}
                </span>
                <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-[#ea4335]">
                  <XCircle size={10} /> {getDiffDays(earliestBatch?.expirationDate) < 0 ? 'Expired Stock' : earliestBatch?.taken ? 'Finished Stock' : 'Out of Stock'}
                </span>
              </div>

              {/* Category Badges (Supports multiple categories e.g. Fever & Pain Relief) */}
              {(() => {
                const cats = Array.from(new Set(getMedicineCategories(group)));
                if (cats.length === 0) return null;
                return (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {cats.map((cat, cIdx) => {
                      const style = getCategoryStyle(cat);
                      const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                      return (
                        <span 
                          key={`cat-exp-${group.groupKey}-${cat.toLowerCase()}-${cIdx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectCategory) {
                              onSelectCategory(isSelected ? 'ALL' : cat);
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer hover:opacity-90 ${style.badgeBg} ${style.badgeText} ${style.badgeBorder} ${isSelected ? 'ring-1 ring-current' : ''}`}
                          title={`Filter by category: ${cat}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dotColor}`} />
                          {cat}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {!isSelectionMode && earliestBatch && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(earliestBatch);
                }}
                className="p-2 bg-slate-50 border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-all"
                title="Edit medicine"
              >
                <Edit3 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Outside Information for Expired Stock */}
        <div className={`flex items-center justify-between mt-2 pt-2 border-t border-slate-100 ${isSelectionMode ? 'ml-7' : ''}`}>
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono font-medium">
            <Calendar size={13} className="text-slate-400" />
            <span>
              {getDiffDays(earliestBatch?.expirationDate) < 0 ? 'Expired: ' : 'Finished: '}
              <strong className="text-rose-600 font-bold">{formatDisplayDate(earliestBatch?.expirationDate)}</strong>
            </span>
          </div>

          <div className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-[#ea4335]">
            {getDiffDays(earliestBatch?.expirationDate) < 0
              ? (group.hasExpiredQuantities || group.totalExpiredQuantity > 0 ? `${group.totalExpiredQuantity} EXPIRED` : 'EXPIRED')
              : earliestBatch?.taken ? 'FINISHED' : 'OUT OF STOCK'}
          </div>
        </div>
      </motion.div>
    );
  };

  if (medicines.length === 0) {
    if (totalMedicinesCount && totalMedicinesCount > 0) {
      return (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-6 my-6 mx-2 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3.5">
            <Filter size={24} />
          </div>
          <h4 className="text-base font-bold text-slate-800">No medicines match this filter</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            No medications found under "{selectedCategory !== 'ALL' ? selectedCategory : 'selected filter'}".
          </p>
          <button
            type="button"
            onClick={() => onSelectCategory?.('ALL')}
            className="mt-4 px-5 py-2 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-black transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            Show All Medicines
          </button>
        </div>
      );
    }

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
      {/* Top Selection Actions Toolbar (shown when selection mode is active) */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex justify-between items-center mb-3 px-2 overflow-hidden"
          >
            <button 
              type="button"
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedIds(new Set());
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors cursor-pointer"
            >
              Cancel Selection
            </button>
            
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {selectedIds.size === medicines.length ? <CheckSquare size={15} className="text-[#0f9d58]" /> : <Square size={15} />}
                All
              </button>
              {selectedIds.size > 0 && (
                <button 
                  type="button"
                  onClick={handleDeleteSelected}
                  className="text-xs text-red-600 hover:text-red-700 transition-colors flex items-center gap-1.5 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full border border-red-100 font-bold cursor-pointer shadow-xs active:scale-95"
                >
                  <Trash2 size={13} />
                  Delete ({selectedIds.size})
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Organize with AI Pharmacist Banner */}
      {!isBannerDismissed && uncategorizedCount > 0 && onAutoCategorize && (
        <div className="mx-1 mb-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/70 to-emerald-50 border border-blue-100/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
          <div className="flex items-start sm:items-center gap-2.5 pr-6 sm:pr-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                <span>Organize with AI Pharmacist</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {uncategorizedCount} to organize
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Automatically verify dosage forms (Tablet, Syrup, Capsule, Ampule) and assign clinical categories.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={async () => {
                triggerMediumHaptic();
                try {
                  await onAutoCategorize();
                  setIsBannerDismissed(true);
                  try {
                    sessionStorage.setItem('dawasnap_hide_organize_banner', 'true');
                    sessionStorage.setItem('dawalens_hide_organize_banner', 'true');
                  } catch {}
                } catch (e) {
                  console.error("Auto organize error:", e);
                }
              }}
              disabled={isCategorizing}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all shrink-0 disabled:opacity-50 touch-manipulation cursor-pointer"
            >
              {isCategorizing ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Organizing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Organize with AI Pharmacist</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                triggerLightHaptic();
                setIsBannerDismissed(true);
                try {
                  sessionStorage.setItem('dawasnap_hide_organize_banner', 'true');
                  sessionStorage.setItem('dawalens_hide_organize_banner', 'true');
                } catch {}
              }}
              aria-label="Dismiss organize banner"
              title="Dismiss banner"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-blue-100/50 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Filtered Empty State */}
      {activeGroups.length === 0 && expiredGroups.length === 0 && medicines.length > 0 && (
        <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-6 my-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Filter size={20} />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No medicines match this filter</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            No items under "{selectedCategory !== 'ALL' ? selectedCategory : 'selected filter'}".
          </p>
          <button
            type="button"
            onClick={() => onSelectCategory?.('ALL')}
            className="mt-3 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-black transition-colors"
          >
            Show All Medicines
          </button>
        </div>
      )}

      {/* Active & Safe Medications Section */}
      {activeGroups.length > 0 && (
        <div className="flex items-center gap-2 mt-4 mb-2.5 px-2 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0f9d58]" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Active & Safe ({activeGroups.length})
          </span>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {activeGroups.map((group, index) => renderActiveGroupCard(group, index))}
      </AnimatePresence>

      {/* Expired Medications Section */}
      {expiredGroups.length > 0 && (
        <div className="flex items-center gap-2 mt-6 mb-2.5 px-2 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ea4335]" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Expired, Empty, or Finished Stock ({expiredGroups.length})
          </span>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {expiredGroups.map((group, index) => renderExpiredGroupCard(group, index))}
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
                Are you sure you want to delete {selectedIds.size} selected medicine record(s)? This action cannot be undone.
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
