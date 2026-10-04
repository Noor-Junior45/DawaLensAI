import React from 'react';
import { X, Trash2, Bell, Palette, ShieldAlert, LogOut, Mail, RotateCcw, AlertTriangle, Key, Copy, Check, ChevronDown, ChevronUp, FileText, Smartphone, Globe, HelpCircle, Pill, Camera, Zap, Info, Upload, Download, Heart, ListTodo, Settings, User, Rss, Newspaper, UserPlus, BookOpen, Shield, Scale, Cookie } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Medicine } from '../types';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

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
  onTestNotification?: () => void;
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

  // Help & Legal overlay callbacks
  onOpenGuide: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenDeleteAccount: () => void;
  onOpenRecentlyDeleted: () => void;
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
  onTestNotification,
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
  isLikedOnly,
  onOpenGuide,
  onOpenPrivacy,
  onOpenTerms,
  onOpenDeleteAccount,
  onOpenRecentlyDeleted
}) => {
  const [showConfirmClear, setShowConfirmClear] = React.useState(false);
  const [isDangerZoneOpen, setIsDangerZoneOpen] = React.useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = React.useState(false);
  const [showRssPanel, setShowRssPanel] = React.useState(false);
  const [copiedRss, setCopiedRss] = React.useState(false);
  const [cookieConsent, setCookieConsent] = React.useState(() => {
    try {
      const stored = localStorage.getItem('dawasnap_ai_cookie_consent') || localStorage.getItem('dawalens_ai_cookie_consent');
      return stored !== 'denied';
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

  const handleNotificationToggle = async () => {
    const nextVal = !browserNotificationsEnabled;

    if (!nextVal) {
      setBrowserNotificationsEnabled(false);
      return;
    }

    // Explicitly request native push notification permissions using Capacitor Push Notifications API
    try {
      if (Capacitor.isNativePlatform() || Capacitor.isPluginAvailable('PushNotifications')) {
        // Direct native system dialog via Capacitor Push Notifications API
        const permStatus = await PushNotifications.requestPermissions();
        const isGranted = permStatus.receive === 'granted';

        if (isGranted) {
          // Register device with FCM to receive native push notifications
          await PushNotifications.register().catch((err) => {
            console.warn('[FCM] Native register warning:', err);
          });

          // Also ensure Local Notifications permissions are requested for high-priority alerts
          try {
            if (Capacitor.isPluginAvailable('LocalNotifications')) {
              await LocalNotifications.requestPermissions();
            }
          } catch {}
        }

        // Sync the user configuration state to reflect the status returned by the system
        setBrowserNotificationsEnabled(isGranted);
        return;
      }
    } catch (err) {
      console.warn('Capacitor PushNotifications.requestPermissions error, attempting web fallback:', err);
    }

    // Direct Web / Chrome system dialog fallback (no alert-based flow)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setBrowserNotificationsEnabled(result === 'granted');
      } catch {
        setBrowserNotificationsEnabled(false);
      }
    } else {
      setBrowserNotificationsEnabled(false);
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
            {/* Circular Avatar */}
            <div className="w-20 h-20 rounded-full relative shadow-xs border border-[#d0d4dc] mb-3">
              <img 
                src={photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150"} 
                alt="Account profile picture" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
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
            <div className="flex items-center justify-between px-1 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-3xs border border-blue-100">
                  <Mail size={15} />
                </div>
                <div>
                  <span className="text-[12px] font-semibold text-[#1f1f1f] block leading-tight">Email Alerts</span>
                </div>
              </div>
              <button 
                onClick={() => setEmailNotificationsEnabled(!emailNotificationsEnabled)}
                className={`w-10 h-5.5 rounded-full transition-all relative shrink-0 ${emailNotificationsEnabled ? 'bg-[#0f9d58]' : 'bg-[#e3e2e0]'}`}
                aria-label="Toggle Email Alerts"
              >
                <div 
                  className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${emailNotificationsEnabled ? 'left-5' : 'left-0.5'}`} 
                />
              </button>
            </div>

            {/* Notifications Switch */}
            <div className="flex items-center justify-between px-1 pt-2 border-t border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-3xs border border-amber-100">
                  <Bell size={15} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-[#1f1f1f] block leading-tight">Notifications</span>
                  {browserNotificationsEnabled && onTestNotification && (
                    <button
                      type="button"
                      onClick={onTestNotification}
                      className="text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer border border-amber-200"
                      title="Send test notification"
                    >
                      Send Test
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={handleNotificationToggle}
                className={`w-10 h-5.5 rounded-full transition-all relative shrink-0 ${browserNotificationsEnabled ? 'bg-[#0f9d58]' : 'bg-[#e3e2e0]'}`}
                aria-label="Toggle Notifications"
              >
                <div 
                  className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${browserNotificationsEnabled ? 'left-5' : 'left-0.5'}`} 
                />
              </button>
            </div>

            {/* Cookie Consent */}
            <div className="flex items-center justify-between px-1 pt-2 border-t border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f6ecde] text-[#a0522d] flex items-center justify-center shrink-0 shadow-3xs border border-[#eeddc5]">
                  <Cookie size={15} />
                </div>
                <div>
                  <span className="text-[12px] font-semibold text-[#1f1f1f] block leading-tight">Cookies & Analytics</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  const newConsent = !cookieConsent;
                  setCookieConsent(newConsent);
                  try {
                    localStorage.setItem('dawasnap_ai_cookie_consent', newConsent ? 'granted' : 'denied');
                    localStorage.setItem('dawalens_ai_cookie_consent', newConsent ? 'granted' : 'denied');
                  } catch (e) {
                    console.warn(e);
                  }
                }}
                className={`w-10 h-5.5 rounded-full transition-all relative shrink-0 ${cookieConsent ? 'bg-[#0f9d58]' : 'bg-[#e3e2e0]'}`}
                aria-label="Toggle Cookies and Analytics"
              >
                <div 
                  className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${cookieConsent ? 'left-5' : 'left-0.5'}`} 
                />
              </button>
            </div>

            {/* Expiry Window */}
            <div className="space-y-1.5 pt-3 border-t border-slate-100 px-1">
              <span className="text-[9px] font-bold text-[#5f6368] block uppercase">Expiry Warning Window</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[30, 60, 90].map((days, dIdx) => (
                  <button
                    key={`days-opt-${days}-${dIdx}`}
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
                {colors.map((color, cIdx) => (
                  <button
                    key={`color-opt-${color.value}-${cIdx}`}
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



          {/* RECENTLY DELETED */}
          <div className="pt-4 border-t border-[#e3e2e0]/60">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRecentlyDeleted();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 bg-rose-50/60 hover:bg-rose-100/60 border border-rose-200/60 rounded-2xl transition-all text-left active:scale-[0.99] cursor-pointer"
            >
              <Trash2 size={15} className="text-[#ea4335] shrink-0" />
              <span className="text-[12px] font-bold text-[#1f1f1f]">Recently Deleted</span>
            </button>
          </div>

          {/* RESOURCES & LEGAL PILL BUTTONS */}
          <div className="space-y-2.5 pt-4 border-t border-[#e3e2e0]/60">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[#0f9d58] px-1">Resources & Legal</h4>
            <div className="grid grid-cols-1 gap-2">
              {/* 1. User Guide & Manual */}
              <button 
                type="button"
                onClick={() => { onClose(); onOpenGuide(); }}
                className="w-full flex items-center px-4 py-3 bg-[#eefcf5] hover:bg-[#e4faf0] border border-[#d1f2e1] rounded-2xl transition-all text-left active:scale-[0.99] group shadow-2xs cursor-pointer"
              >
                <span className="text-[12px] font-bold text-[#1a3a2a] flex items-center gap-2.5">
                  <BookOpen size={15} className="text-[#0f9d58]" />
                  User Guide & Manual
                </span>
              </button>

              {/* 2. Privacy Policy */}
              <button 
                type="button"
                onClick={() => { onClose(); onOpenPrivacy(); }}
                className="w-full flex items-center px-4 py-3 bg-[#eefcf5] hover:bg-[#e4faf0] border border-[#d1f2e1] rounded-2xl transition-all text-left active:scale-[0.99] group shadow-2xs cursor-pointer"
              >
                <span className="text-[12px] font-bold text-[#1a3a2a] flex items-center gap-2.5">
                  <Shield size={15} className="text-[#0f9d58]" />
                  Privacy Policy
                </span>
              </button>

              {/* 3. Terms of Service */}
              <button 
                type="button"
                onClick={() => { onClose(); onOpenTerms(); }}
                className="w-full flex items-center px-4 py-3 bg-[#eefcf5] hover:bg-[#e4faf0] border border-[#d1f2e1] rounded-2xl transition-all text-left active:scale-[0.99] group shadow-2xs cursor-pointer"
              >
                <span className="text-[12px] font-bold text-[#1a3a2a] flex items-center gap-2.5">
                  <Scale size={15} className="text-[#0f9d58]" />
                  Terms of Service
                </span>
              </button>

              {/* 4. Delete Account & Data (Google Play Policy Compliant) */}
              <button 
                type="button"
                onClick={() => { onClose(); onOpenDeleteAccount(); }}
                className="w-full flex items-center px-4 py-3 bg-[#fdf2f2] hover:bg-[#fde8e8] border border-[#fecaca] rounded-2xl transition-all text-left active:scale-[0.99] group shadow-2xs cursor-pointer"
              >
                <span className="text-[12px] font-bold text-[#991b1b] flex items-center gap-2.5">
                  <Trash2 size={15} className="text-rose-600" />
                  Delete Account & Data
                </span>
              </button>
            </div>
          </div>

          {/* Sign Out Button placed directly inside the page below Danger Zone */}
          <div className="pt-3 pb-4 flex justify-center">
            <button 
              onClick={onLogout}
              className="w-full max-w-[320px] py-3.5 bg-[#ea4335] hover:bg-[#ea4335]/90 text-white rounded-full transition-all font-bold flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg active:scale-98"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
