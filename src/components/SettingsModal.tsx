import React from 'react';
import { X, Trash2, Bell, Palette, ShieldAlert, LogOut, Mail, RotateCcw, AlertTriangle, Key, Copy, Check, ChevronDown, ChevronUp, FileText, Smartphone, Globe, HelpCircle, Pill, Camera, Zap, Info, Upload, Download, Heart, ListTodo, Settings, User, Rss, Newspaper, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Medicine } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  onClearData: () => void;
  alertThreshold: number;
  setAlertThreshold: (val: number) => void;
  lowQuantityThreshold: number;
  setLowQuantityThreshold: (val: number) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  emailNotificationsEnabled: boolean;
  setEmailNotificationsEnabled: (val: boolean) => void;
  browserNotificationsEnabled: boolean;
  setBrowserNotificationsEnabled: (val: boolean) => void;
  photoURL?: string;
  userEmail: string;
  onLogout: () => void;
  medicines: Medicine[];
  deletedMedicines: Medicine[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  
  // Gmail-style drop down integrations
  onImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportCSV: () => void;
  onOpenMailbox: () => void;

  // New menu props for screenshot match
  onResetToHome?: () => void;
  onToggleLikedOnly?: () => void;
  isLikedOnly?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  onClearData,
  alertThreshold,
  setAlertThreshold,
  lowQuantityThreshold,
  setLowQuantityThreshold,
  accentColor,
  setAccentColor,
  emailNotificationsEnabled,
  setEmailNotificationsEnabled,
  browserNotificationsEnabled,
  setBrowserNotificationsEnabled,
  photoURL,
  userEmail,
  onLogout,
  medicines,
  deletedMedicines,
  onRestore,
  onPermanentDelete,
  onImportCSV,
  onExportCSV,
  onOpenMailbox,
  onResetToHome,
  onToggleLikedOnly,
  isLikedOnly
}) => {
  const [showConfirmClear, setShowConfirmClear] = React.useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = React.useState(false);
  const [showRssPanel, setShowRssPanel] = React.useState(false);
  const [copiedRss, setCopiedRss] = React.useState(false);
  const [cookieConsent, setCookieConsent] = React.useState(() => {
    try {
      return localStorage.getItem('dawalens_ai_cookie_consent') !== 'denied';
    } catch (e) {
      return true; // Default to true if storage is blocked
    }
  });

  const colors = [
    { name: 'Orange', value: '#f97316' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Amber', value: '#d97706' },
  ];

  const [googleVerification, setGoogleVerification] = React.useState(() => {
    try {
      return localStorage.getItem('google_site_verification_token') || '';
    } catch (e) {
      return '';
    }
  });
  const [savedVerificationMsg, setSavedVerificationMsg] = React.useState(false);
  const [openSection, setOpenSection] = React.useState<'guide' | 'tos' | 'privacy' | 'verification' | 'pwa' | null>(null);
  const [pwaOS, setPwaOS] = React.useState<'ios' | 'android' | 'desktop'>('ios');

  const handleSaveVerification = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('google_site_verification_token', googleVerification);
      
      // Dynamically update head meta tag
      const existing = document.querySelector('meta[name="google-site-verification"]');
      if (existing) existing.remove();
      
      if (googleVerification.trim()) {
        const meta = document.createElement('meta');
        meta.name = 'google-site-verification';
        meta.content = googleVerification.trim();
        document.head.appendChild(meta);
      }
      setSavedVerificationMsg(true);
      setTimeout(() => setSavedVerificationMsg(false), 2000);
    } catch (err) {
      console.error('Failed to save Google Site Verification:', err);
    }
  };

  // Derive human friendly name from email
  const displayName = React.useMemo(() => {
    if (!userEmail) return 'X GAMER';
    const part = userEmail.split('@')[0];
    if (part.toLowerCase().includes('hassan')) {
      return 'MD HASSAN';
    }
    return part.toUpperCase();
  }, [userEmail]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px] pointer-events-auto cursor-default transition-opacity" 
      />
      
      {/* Soft Cream-White Google Profile Style Dropdown */}
      <motion.div 
        initial={{ opacity: 0, y: -12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute right-4 sm:right-8 top-[72px] w-[calc(100vw-32px)] max-w-[390px] bg-[#faf8f5] border border-[#e3e2e0] rounded-[32px] shadow-[0_24px_60px_rgba(0,0,0,0.12)] flex flex-col max-h-[82vh] overflow-hidden pointer-events-auto z-50 ring-1 ring-black/5"
      >
        {/* Floating Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1.5 hover:bg-[#e9e8e5]/60 rounded-full text-slate-500 hover:text-slate-800 transition-all z-50 pointer-events-auto bg-white/40 backdrop-blur-xs border border-[#e3e2e0]/60 shadow-xs"
          title="Close"
        >
          <X size={16} />
        </button>

        {/* Scrollable Content Pane */}
        <div className="flex-1 overflow-y-auto px-6 pt-8 pb-6 space-y-4 custom-scrollbar">
          
          {/* Centered Google Card Profile Section */}
          <div className="flex flex-col items-center text-center pb-4 border-b border-[#e3e2e0]/60">
            {/* Circular Avatar with Edit Camera Overlay */}
            <div className="w-20 h-20 rounded-full relative shadow-xs border border-[#d0d4dc] mb-3">
              <img 
                src={photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150"} 
                alt="Account profile picture" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
              <div 
                className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-[#e3e2e0] rounded-full flex items-center justify-center shadow-xs text-slate-600 hover:text-slate-800 hover:bg-slate-50 cursor-pointer transition-colors" 
                title="Change profile picture"
                onClick={() => alert("Photo editing is managed securely via Google Account settings.")}
              >
                <Camera size={12} />
              </div>
            </div>
            
            <p className="text-[13px] text-[#5f6368] font-normal select-all">{userEmail}</p>
          </div>

          {/* POWER INTEGRATIONS & TOOLS */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[#0f9d58] px-1">Power Integrations & Tools</h4>
            <div className="grid grid-cols-1 gap-1">
              {/* In-App Mailbox */}
              <button 
                onClick={() => { onOpenMailbox(); onClose(); }}
                className="flex items-center gap-3 w-full text-left p-2.5 hover:bg-[#faf8f5] border border-transparent hover:border-slate-100 rounded-xl transition-all group"
              >
                <Mail className="text-[#ea4335]" size={16} />
                <div>
                  <span className="text-[12px] font-bold text-[#1f1f1f] block leading-none">Treatment Mailbox</span>
                  <span className="text-[10px] text-[#5f6368] block mt-0.5">Secure emails & reports</span>
                </div>
              </button>

              {/* Import CSV */}
              <label className="flex items-center gap-3 w-full text-left p-2.5 hover:bg-[#faf8f5] border border-transparent hover:border-slate-100 rounded-xl transition-all group cursor-pointer">
                <Upload className="text-[#0f9d58]" size={16} />
                <div>
                  <span className="text-[12px] font-bold text-[#1f1f1f] block leading-none">Import CSV Backup</span>
                  <span className="text-[10px] text-[#5f6368] block mt-0.5">Restore vault medicines</span>
                </div>
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={(e) => {
                    onImportCSV(e);
                    e.target.value = '';
                    onClose();
                  }}
                />
              </label>

              {/* Export CSV */}
              <button 
                onClick={() => { onExportCSV(); onClose(); }}
                className="flex items-center gap-3 w-full text-left p-2.5 hover:bg-[#faf8f5] border border-transparent hover:border-slate-100 rounded-xl transition-all group"
              >
                <Download className="text-[#ab47bc]" size={16} />
                <div>
                  <span className="text-[12px] font-bold text-[#1f1f1f] block leading-none">Export CSV Backup</span>
                  <span className="text-[10px] text-[#5f6368] block mt-0.5">Download full database</span>
                </div>
              </button>
            </div>
          </div>

          {/* ALERTS & RECURRING REMINDERS */}
          <div className="space-y-4 pt-4 border-t border-[#e3e2e0]/60">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[#0f9d58] px-1">Alerts & Reminders</h4>
            
            {/* Email Switch */}
            <div className="flex items-center justify-between px-1">
              <div>
                <span className="text-[12px] font-semibold text-[#1f1f1f] block">Email Alerts</span>
                <span className="text-[10px] text-[#5f6368] block">Weekly expiry alerts to your email</span>
              </div>
              <button 
                onClick={() => setEmailNotificationsEnabled(!emailNotificationsEnabled)}
                className={`w-10 h-5.5 rounded-full transition-all relative ${emailNotificationsEnabled ? 'bg-[#0f9d58]' : 'bg-[#e3e2e0]'}`}
              >
                <div 
                  className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${emailNotificationsEnabled ? 'left-5' : 'left-0.5'}`} 
                />
              </button>
            </div>

            {/* Browser Push Switch */}
            <div className="flex items-center justify-between px-1 pt-2 border-t border-slate-100">
              <div>
                <span className="text-[12px] font-semibold text-[#1f1f1f] block">Push Notifications</span>
                <span className="text-[10px] text-[#5f6368] block">Local browser warning triggers</span>
              </div>
              <button 
                onClick={() => setBrowserNotificationsEnabled(!browserNotificationsEnabled)}
                className={`w-10 h-5.5 rounded-full transition-all relative ${browserNotificationsEnabled ? 'bg-[#0f9d58]' : 'bg-[#e3e2e0]'}`}
              >
                <div 
                  className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${browserNotificationsEnabled ? 'left-5' : 'left-0.5'}`} 
                />
              </button>
            </div>

            {/* Expiry Window */}
            <div className="space-y-1.5 pt-3 border-t border-slate-100 px-1">
              <span className="text-[9px] font-bold text-[#5f6368] block uppercase">Expiry Warning Window</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[30, 60, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setAlertThreshold(days)}
                    className={`py-1.5 rounded-lg border transition-all text-[10px] font-bold ${
                      alertThreshold === days 
                        ? 'bg-[#0f9d58] text-white border-[#0f9d58]' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Low Stock */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3 px-1">
              <div className="flex-1">
                <span className="text-[12px] font-semibold text-[#1f1f1f] block">Low Stock Limit</span>
                <span className="text-[10px] text-[#5f6368] block">Alert when medication pills are low</span>
              </div>
              <input
                type="number"
                min="0"
                value={lowQuantityThreshold ?? 0}
                onChange={(e) => setLowQuantityThreshold(parseInt(e.target.value, 10) || 0)}
                className="w-14 bg-white border border-[#e3e2e0] rounded-lg px-1.5 py-1 text-slate-800 focus:outline-none focus:border-[#0f9d58] transition-all text-center text-xs font-semibold shadow-xs"
              />
            </div>
          </div>

          {/* AESTHETICS & THEMES */}
          <div className="space-y-3 pt-4 border-t border-[#e3e2e0]/60">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[#0f9d58] px-1">Aesthetics & Themes</h4>
            
            {/* Accent color */}
            <div className="space-y-1.5 px-1">
              <span className="text-[9px] font-bold text-[#5f6368] block uppercase mb-1.5">Accent Color</span>
              <div className="flex gap-2 flex-wrap">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setAccentColor(color.value)}
                    className={`w-6 h-6 rounded-full border transition-all flex items-center justify-center shadow-xs ${
                      accentColor === color.value ? 'border-slate-800 scale-110 ring-2 ring-[#0f9d58]/10' : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color.value }}
                  >
                    {accentColor === color.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* VAULT SECURITY */}
          <div className="space-y-4 pt-4 border-t border-[#e3e2e0]/60">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[#0f9d58] px-1">Vault Security</h4>

            {/* Cookie Consent */}
            <div className="flex items-center justify-between px-1">
              <div>
                <span className="text-[12px] font-semibold text-[#1f1f1f] block">Cookies & Analytics</span>
                <span className="text-[10px] text-[#5f6368] block">Anonymous feedback support</span>
              </div>
              <button 
                onClick={() => {
                  const newConsent = !cookieConsent;
                  setCookieConsent(newConsent);
                  try {
                    localStorage.setItem('dawalens_ai_cookie_consent', newConsent ? 'granted' : 'denied');
                  } catch (e) {
                    console.warn(e);
                  }
                }}
                className={`w-10 h-5.5 rounded-full transition-all relative ${cookieConsent ? 'bg-[#0f9d58]' : 'bg-[#e3e2e0]'}`}
              >
                <div 
                  className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${cookieConsent ? 'left-5' : 'left-0.5'}`} 
                />
              </button>
            </div>
          </div>

          {/* GUIDES */}
          <div className="space-y-3 pt-4 border-t border-[#e3e2e0]/60">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[#0f9d58] px-1">Guides</h4>
            
            {/* Collapsible item: User Guide */}
            <div className="border border-[#e3e2e0] rounded-xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setOpenSection(openSection === 'guide' ? null : 'guide')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-[#faf8f5] transition-colors text-left"
              >
                <span className="text-xs font-semibold text-[#1f1f1f] flex items-center gap-1.5">
                  <Info size={14} className="text-[#0f9d58]" />
                  How-To User Guide
                </span>
                {openSection === 'guide' ? <ChevronUp size={14} className="text-[#5f6368]" /> : <ChevronDown size={14} className="text-[#5f6368]" />}
              </button>
              <AnimatePresence>
                {openSection === 'guide' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-[#e3e2e0] bg-[#faf8f5]/50"
                  >
                    <div className="p-3.5 space-y-3 text-[11px] leading-relaxed text-[#5f6368]">
                      <div className="flex gap-2 items-start">
                        <div className="p-1 bg-emerald-50 text-[#0f9d58] rounded shrink-0">
                          <Camera size={12} />
                        </div>
                        <div>
                          <strong className="text-[#1f1f1f] block font-semibold">Scan Prescription Labels</strong>
                          Snap or upload prescription labels. Gemini parses schedule times, names, counts, and automatically populates the database.
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* RECENTLY DELETED */}
          <div className="space-y-2 pt-4 border-t border-[#e3e2e0]/60">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[#0f9d58] px-1">Recently Deleted (15 Days Vault)</h4>
            <div className="bg-[#faf8f5] border border-[#e3e2e0] rounded-xl p-2.5 space-y-2">
              {deletedMedicines.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic text-center py-1">No recently deleted items.</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {deletedMedicines.map((med, idx) => {
                    const daysLeft = med.deletedAt ? Math.max(0, 15 - Math.floor((Date.now() - med.deletedAt) / (1000 * 60 * 60 * 24))) : 15;
                    return (
                      <div key={med.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#e3e2e0]">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[12px] font-bold text-[#1f1f1f] truncate">{med.name}</span>
                          <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                            <AlertTriangle size={10} className="text-[#ea4335]" />
                            {daysLeft} days remaining
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            onClick={() => onRestore(med.id)}
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="Restore"
                          >
                            <RotateCcw size={12} />
                          </button>
                          <button 
                            onClick={() => onPermanentDelete(med.id)}
                            className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
                            title="Delete Permanently"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="space-y-3 pt-4 border-t border-[#e3e2e0]/60">
            <div className="flex items-center gap-1.5 text-rose-600 mb-2 px-1">
              <ShieldAlert size={14} />
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider">Danger Zone</h4>
            </div>
            
            {!showConfirmClear ? (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="w-full py-2 bg-rose-50/50 text-rose-700 border border-rose-100 hover:bg-rose-100/60 rounded-xl text-xs font-bold transition-all"
              >
                Clear All Data
              </button>
            ) : (
              <div className="space-y-2.5 bg-rose-50 p-3 rounded-xl border border-rose-100">
                <p className="text-[10px] text-rose-700 text-center font-bold">This operation is irreversible. Proceed?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="flex-1 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onClearData();
                      setShowConfirmClear(false);
                      onClose();
                    }}
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SIGN OUT BUTTON */}
          <div className="pt-5 border-t border-[#e3e2e0] flex flex-col items-center">
            <button 
              onClick={onLogout}
              className="px-6 py-2.5 border border-[#e3e2e0] rounded-full text-[#1f1f1f] hover:bg-[#e9e8e5]/50 transition-all font-bold flex items-center justify-center gap-2 text-xs bg-white shadow-xs active:scale-98"
            >
              <LogOut size={14} className="text-[#ea4335]" />
              Sign out of all accounts
            </button>
          </div>

        </div>

        {/* Footer info matching Google's legal footer style */}
        <div className="px-6 py-4 border-t border-[#e3e2e0] bg-[#faf8f5] shrink-0 text-center flex flex-col gap-1">
          <div className="flex justify-center gap-3 text-[11px] text-[#5f6368] font-medium">
            <a href="/privacy.html" target="_blank" rel="noreferrer" className="hover:text-slate-800 hover:underline">Privacy Policy</a>
            <span>•</span>
            <a href="/terms.html" target="_blank" rel="noreferrer" className="hover:text-slate-800 hover:underline">Terms of Service</a>
          </div>
          <p className="text-[10px] text-[#5f6368]/80 font-semibold">Verified Domain: noorpos.in</p>
        </div>
      </motion.div>
    </div>
  );
};
