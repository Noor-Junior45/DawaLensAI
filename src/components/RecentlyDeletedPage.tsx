import React from 'react';
import { Medicine } from '../types';
import { ArrowLeft, Trash2, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { useEdgeSwipeBack } from '../utils/mobileGestures';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface RecentlyDeletedPageProps {
  deletedMedicines: Medicine[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onBack: () => void;
}

export const RecentlyDeletedPage: React.FC<RecentlyDeletedPageProps> = ({
  deletedMedicines,
  onRestore,
  onPermanentDelete,
  onBack
}) => {
  // Mobile Edge-Swipe from left to navigate back
  useEdgeSwipeBack({ onBack });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-[#faf8f5] text-slate-800 flex flex-col overflow-hidden"
    >
      {/* Sticky Clean Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-[#e3e2e0] px-4 py-3.5 flex items-center shrink-0 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            onBack();
          }}
          className="p-2 -ml-2 mr-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base sm:text-lg font-bold text-[#1f1f1f] leading-tight">
          Recently Deleted
        </h1>
      </header>

      {/* Product List Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-3">
          {deletedMedicines.length === 0 ? (
            <div className="text-center py-20 px-4 bg-white rounded-2xl border border-[#e3e2e0] space-y-3 shadow-2xs">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <h2 className="text-sm font-bold text-slate-700">No recently deleted products</h2>
            </div>
          ) : (
            deletedMedicines.map((med, idx) => (
              <div
                key={`recently-deleted-${med.id || idx}-${idx}`}
                className="bg-white rounded-2xl border border-[#e3e2e0] p-4 flex items-center justify-between gap-4 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-[#1f1f1f] truncate">
                    {med.name}
                  </h3>
                  {med.dosage && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {med.dosage}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      triggerSuccessHaptic();
                      onRestore(med.id);
                    }}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    title="Restore product"
                  >
                    <RotateCcw size={14} />
                    <span>Restore</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerLightHaptic();
                      onPermanentDelete(med.id);
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    title="Delete permanently"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </motion.div>
  );
};
