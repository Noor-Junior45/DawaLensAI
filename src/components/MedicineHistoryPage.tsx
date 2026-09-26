import React, { useState, useEffect } from 'react';
import { Medicine, MedicineHistory } from '../types';
import { ArrowLeft, Clock, History as HistoryIcon, Calendar, CheckCircle2, Edit3, PlusCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { db, collection, query, orderBy, onSnapshot, handleFirestoreError, OperationType } from '../firebase';

interface MedicineHistoryPageProps {
  medicine: Medicine;
  onBack: () => void;
}

export const MedicineHistoryPage: React.FC<MedicineHistoryPageProps> = ({
  medicine,
  onBack
}) => {
  const [history, setHistory] = useState<MedicineHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!medicine?.id) return;

    const q = query(
      collection(db, `medicines/${medicine.id}/history`),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicineHistory));
      const uniqueHistory = Array.from(new Map(historyData.map(h => [h.id, h])).values());
      setHistory(uniqueHistory);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `medicines/${medicine.id}/history`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [medicine?.id]);

  const formatActionType = (type: string) => {
    switch (type) {
      case 'CREATE': return 'Added';
      case 'EDIT': return 'Edited';
      case 'MARK_TAKEN': return 'Marked Taken';
      case 'MARK_NOT_TAKEN': return 'Marked Untaken';
      case 'DELETE': return 'Deleted';
      default: return type;
    }
  };

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'CREATE':
        return {
          icon: <PlusCircle size={15} />,
          className: 'text-emerald-700 bg-emerald-100/70 border border-emerald-200'
        };
      case 'EDIT':
        return {
          icon: <Edit3 size={15} />,
          className: 'text-blue-700 bg-blue-100/70 border border-blue-200'
        };
      case 'MARK_TAKEN':
        return {
          icon: <CheckCircle2 size={15} />,
          className: 'text-purple-700 bg-purple-100/70 border border-purple-200'
        };
      case 'MARK_NOT_TAKEN':
        return {
          icon: <Clock size={15} />,
          className: 'text-amber-700 bg-amber-100/70 border border-amber-200'
        };
      case 'DELETE':
        return {
          icon: <AlertCircle size={15} />,
          className: 'text-red-700 bg-red-100/70 border border-red-200'
        };
      default:
        return {
          icon: <Clock size={15} />,
          className: 'text-slate-700 bg-slate-100 border border-slate-200'
        };
    }
  };

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Recent';
    try {
      const d = new Date(timestamp);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Recent';
    }
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
      <header className="sticky top-0 z-20 bg-[#faf8f5]/90 backdrop-blur-md border-b border-[#e3e2e0] px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 rounded-full text-slate-700 hover:text-black hover:bg-black/5 active:scale-95 transition-all"
            title="Back to Details"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#1f1f1f]">
              Medication History
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {medicine.name}
            </p>
          </div>
        </div>

        <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/60 text-slate-700">
          {history.length} {history.length === 1 ? 'event' : 'events'}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-5 sm:px-8 py-6 sm:py-8 space-y-6">
        
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-[#0f9d58] rounded-full animate-spin" />
            <p className="text-sm">Loading medication history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
            <div className="w-14 h-14 rounded-full bg-white border border-[#e3e2e0] flex items-center justify-center text-slate-400 shadow-sm">
              <HistoryIcon size={24} />
            </div>
            <h3 className="font-semibold text-base text-[#1f1f1f]">No History Recorded Yet</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              Actions like marking doses as taken, editing details, or changing stocks will automatically log here.
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-6 pl-5 sm:pl-6 space-y-6 py-2">
            {history.map((item, idx) => {
              const badge = getActionBadge(item.actionType);

              return (
                <div key={`hist-entry-${item.id || idx}-${idx}`} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] sm:-left-[35px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-slate-400 group-hover:border-[#0f9d58] transition-colors" />

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${badge.className}`}>
                        {badge.icon}
                        {formatActionType(item.actionType)}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>

                    {item.details && (
                      <p className="text-sm text-slate-700 leading-relaxed font-normal">
                        {item.details}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>
    </motion.div>
  );
};
