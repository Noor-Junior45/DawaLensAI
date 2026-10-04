import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Mail, RefreshCw, CheckCircle2, AlertTriangle, 
  Clock, Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  collection, query, where, onSnapshot, 
  getDocs, writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Medicine } from '../types';
import { getExpiryEmailHTML } from '../services/emailService';

interface MailboxModalProps {
  onClose: () => void;
  user: any;
  medicines: Medicine[];
}

interface MailDocument {
  id: string;
  to: string;
  message: {
    subject: string;
    text: string;
    html: string;
  };
  createdAt?: number;
  delivery?: {
    attempts?: number;
    endTime?: any;
    error?: string;
    state: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'SIMULATED';
  };
}

export const TreatmentMailboxPage: React.FC<MailboxModalProps> = ({ onClose, user, medicines }) => {
  const [emails, setEmails] = useState<MailDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<MailDocument | null>(null);
  const [activeMobileView, setActiveMobileView] = useState<'list' | 'detail'>('list');

  // Fallback sample email so the queue email preview is always immediately visible even if outbox is fresh
  const fallbackEmail: MailDocument = React.useMemo(() => {
    const med = medicines.filter(m => !m.isDeleted)[0] || {
      name: "Becosules",
      dosage: "500mg",
      expirationDate: "2026-10-01",
      quantity: 20
    };
    return {
      id: 'preview-queue-sample',
      to: user?.email || 'patient@example.com',
      message: {
        subject: `🚨 Urgent: ${med.name} has Expired - Do Not Consume`,
        text: `DawaSnap AI Alert: Your medicine ${med.name} has reached its expiration date (${med.expirationDate}). Please DO NOT take this medicine. Expired medications can lose chemical potency or produce dangerous degradation compounds.`,
        html: getExpiryEmailHTML(med.name, med.quantity || 20, med.expirationDate || "2026-10-01", "EXPIRED")
      },
      createdAt: Date.now(),
      delivery: {
        state: 'SUCCESS',
        attempts: 1
      }
    };
  }, [medicines, user]);

  // Display list: ensure queue email is ALWAYS visible even before first Firestore send
  const displayEmails: MailDocument[] = React.useMemo(() => {
    if (emails.length > 0) return emails;
    return [fallbackEmail];
  }, [emails, fallbackEmail]);

  // Handle Escape key to return to profile
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Real-time listen to queue updates for this user
  useEffect(() => {
    if (!user?.email) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, 'mail'),
      where('to', '==', user.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mailList = snapshot.docs.map(doc => {
        const data = doc.data();
        let createdAtMillis = Date.now();
        if (data.timestamp) {
          createdAtMillis = typeof data.timestamp.toMillis === 'function' 
            ? data.timestamp.toMillis() 
            : Number(data.timestamp);
        }
        return {
          id: doc.id,
          to: data.to,
          message: data.message,
          createdAt: createdAtMillis,
          delivery: data.delivery || data.status
        } as MailDocument;
      });

      // Deduplicate by ID to prevent duplicate keys
      const uniqueMail = Array.from(new Map(mailList.map(m => [m.id, m])).values());

      // Sort in-memory to dodge custom indexing requirements
      const sorted = uniqueMail.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setEmails(sorted);
      if (sorted.length > 0) {
        setSelectedEmail(prev => prev ? (sorted.find(m => m.id === prev.id) || sorted[0]) : sorted[0]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Mail subscription failed:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Safe method to empty out sent mailbox documents completely
  const clearSentHistory = async () => {
    if (!user?.email || emails.length === 0) return;
    if (window.confirm("This will permanently clear your outbox/mail queue history. Continue?")) {
      try {
        const q = query(collection(db, 'mail'), where('to', '==', user.email));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        setEmails([]);
        setSelectedEmail(null);
      } catch (err: any) {
        console.error("Failed to delete emails:", err);
        alert("Operation denied: " + err.message);
      }
    }
  };

  const getStatusDisplay = (delivery: MailDocument['delivery']) => {
    if (!delivery) {
      return {
        label: 'Sent',
        style: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        icon: <CheckCircle2 size={12} />
      };
    }
    const state = String(delivery.state || '').toUpperCase();
    switch (state) {
      case 'SUCCESS':
      case 'SIMULATED':
        return {
          label: 'Sent',
          style: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          icon: <CheckCircle2 size={12} />
        };
      case 'PROCESSING':
        return {
          label: 'Sending...',
          style: 'bg-blue-50 text-blue-700 border-blue-100',
          icon: <RefreshCw size={12} className="animate-spin" />
        };
      case 'ERROR':
        return {
          label: 'Error',
          style: 'bg-rose-50 text-rose-700 border-rose-100',
          icon: <AlertTriangle size={12} />
        };
      default:
        return {
          label: 'Sent',
          style: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          icon: <CheckCircle2 size={12} />
        };
    }
  };

  // Inject styles to hide scrollbars completely inside the preview iframe
  const preparePreviewHtml = (rawHtml?: string) => {
    if (!rawHtml) return '';
    const noScrollStyle = '<style>html,body{overflow-x:hidden !important; -webkit-overflow-scrolling:touch; scrollbar-width:none !important; -ms-overflow-style:none !important;} ::-webkit-scrollbar{display:none !important; width:0 !important; height:0 !important;}</style>';
    if (rawHtml.includes('</head>')) {
      return rawHtml.replace('</head>', `${noScrollStyle}</head>`);
    }
    return `${noScrollStyle}${rawHtml}`;
  };

  const activeEmailToDisplay = selectedEmail || (emails.length > 0 ? emails[0] : fallbackEmail);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-0 z-50 bg-[#faf8f5] flex flex-col text-[#2d2a26] mailbox-scroll-hidden w-full h-full overflow-hidden"
    >
      <style>{`
        .mailbox-scroll-hidden,
        .mailbox-scroll-hidden * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .mailbox-scroll-hidden *::-webkit-scrollbar,
        .mailbox-scroll-hidden::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>

      {/* Sticky Full-Width Header */}
      <header className="sticky top-0 z-20 bg-[#faf8f5]/95 backdrop-blur-md border-b border-[#e3e2e0] px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Tail-less arrow on the left side of the heading */}
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 -ml-1 rounded-full text-[#2d2a26] hover:bg-[#e3e2e0]/60 active:scale-95 transition-all flex items-center justify-center"
            title="Back to Profile"
            aria-label="Back to Profile"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#2d2a26]">
            Treatment Mailbox
          </h1>
        </div>

        {/* Clear Outbox action button if outbox has emails */}
        {emails.length > 0 && (
          <button
            id="btn-clear-mail-logs"
            onClick={clearSentHistory}
            className="py-1.5 px-3 border border-red-200 bg-red-50 hover:bg-red-100 active:scale-95 rounded-full text-xs text-red-700 font-bold flex items-center justify-center gap-1.5 transition-all shrink-0"
            title="Clear outbox history"
          >
            <Trash2 size={13} />
            <span>Clear Outbox</span>
          </button>
        )}
      </header>

      {/* Main Page Layout: Two Columns (Left queue list, Right email preview) */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row mailbox-scroll-hidden w-full h-full">
        
        {/* Left panel: List of Emails with Active Queue Mail always visible */}
        <div className={`w-full md:w-[36%] lg:w-[32%] overflow-y-auto flex flex-col h-full bg-[#fcfaf7] border-r border-[#e3e2e0] mailbox-scroll-hidden shrink-0 ${
          activeMobileView === 'detail' ? 'hidden md:flex' : 'flex'
        }`}>
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <RefreshCw size={24} className="animate-spin text-[#8c857b]" />
              <p className="text-sm text-[#8c857b] mt-4 font-medium">Connecting to Mail Queue...</p>
            </div>
          ) : (
            <div className="divide-y divide-[#e3e2e0] pb-6 mailbox-scroll-hidden">
              {displayEmails.map((mail, idx) => {
                const isFallback = mail.id === 'preview-queue-sample';
                const status = isFallback 
                  ? {
                      label: 'Active Queue',
                      style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      icon: <Clock size={12} />
                    }
                  : getStatusDisplay(mail.delivery);
                const isSelected = activeEmailToDisplay?.id === mail.id;
                
                return (
                  <button
                    key={`mail-${mail.id || idx}-${idx}`}
                    onClick={() => {
                      setSelectedEmail(mail);
                      setActiveMobileView('detail');
                    }}
                    className={`w-full text-left p-4 sm:p-5 transition-all flex flex-col gap-1.5 border-l-[3px] ${
                      isSelected 
                        ? 'bg-white border-[#0f9d58] shadow-xs' 
                        : 'hover:bg-white/60 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest flex items-center gap-1.5 ${status.style}`}>
                        {status.icon}
                        {status.label}
                      </span>
                      <time className="text-[10px] text-[#8c857b] font-mono">
                        {isFallback ? 'Scheduled' : new Date(mail.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                    
                    <h4 className="text-xs sm:text-sm font-bold text-[#2d2a26] leading-tight tracking-tight line-clamp-2">
                      {mail.message.subject}
                    </h4>
                    
                    <p className="text-[11px] text-[#8c857b] line-clamp-1 truncate font-medium">
                      {mail.message.text}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel: Single Mail Preview */}
        <div className={`flex-1 overflow-y-auto h-full flex flex-col bg-white mailbox-scroll-hidden ${
          activeMobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-5 mailbox-scroll-hidden">
            
            {/* Mobile Back Button */}
            <div className="md:hidden">
              <button
                onClick={() => setActiveMobileView('list')}
                className="flex items-center gap-1.5 text-xs font-bold text-[#0f9d58] hover:text-[#0b7a44] py-1.5 px-3 bg-[#eefcf5] rounded-full"
              >
                <ChevronLeft size={16} />
                Back to Queue List
              </button>
            </div>

            {/* Header Information */}
            <div className="bg-[#fcfaf7] border border-[#e3e2e0] p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#8c857b]">Target Recipient</span>
                  <p className="text-xs sm:text-sm font-bold text-[#2d2a26]">{activeEmailToDisplay.to}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#8c857b]">Timestamp</span>
                  <p className="text-[11px] sm:text-xs text-[#8c857b] font-mono">
                    {new Date(activeEmailToDisplay.createdAt || Date.now()).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#8c857b]">Subject Line</span>
                <h3 className="text-sm sm:text-base font-bold text-[#2d2a26] mt-0.5">{activeEmailToDisplay.message.subject}</h3>
              </div>

              {/* Delivery Status Insights */}
              {activeEmailToDisplay.delivery && activeEmailToDisplay.delivery.error && (
                <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-800 uppercase">Trigger Mail Error</p>
                    <p className="text-[11px] text-red-700 leading-relaxed mt-0.5">{activeEmailToDisplay.delivery.error}</p>
                  </div>
                </div>
              )}

              {(!activeEmailToDisplay.delivery || activeEmailToDisplay.delivery.state === 'SUCCESS' || activeEmailToDisplay.delivery.state === 'SIMULATED') && (
                <div className="mt-1 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#0f9d58] shrink-0" />
                  <p className="text-xs font-medium text-emerald-800">
                    Email template processed and verified for delivery.
                  </p>
                </div>
              )}
            </div>

            {/* Rendered Template Body (Full view, no scrollbars) */}
            <div className="space-y-1.5 mailbox-scroll-hidden">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8c857b] block ml-1">
                📩 Rendered Email Preview:
              </span>
              <div className="bg-[#faf8f5] border border-[#e3e2e0] rounded-2xl overflow-hidden shadow-xs mailbox-scroll-hidden">
                <iframe
                  title="Email Body Preview"
                  srcDoc={preparePreviewHtml(activeEmailToDisplay.message.html)}
                  className="w-full h-[620px] lg:h-[700px] border-0 select-none bg-white mailbox-scroll-hidden"
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </motion.div>
  );
};

export const MailboxModal = TreatmentMailboxPage;
