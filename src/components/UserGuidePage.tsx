import React from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  Camera, 
  Layers, 
  AlertTriangle, 
  Bell, 
  Lock, 
  Mail,
  Sparkles
} from 'lucide-react';

interface UserGuidePageProps {
  onBack: () => void;
  isLoggedIn?: boolean;
}

export const UserGuidePage: React.FC<UserGuidePageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#0f9d58] selection:text-white flex flex-col">
      {/* Minimal Sticky Header (No Description) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-8 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 active:scale-95 cursor-pointer"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-[#0f9d58]" />
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                User Guide & Manual
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Minimal Document */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 space-y-10">
        {/* Title */}
        <div className="border-b border-slate-100 pb-6 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-[#0f9d58]">
            <Sparkles size={11} /> Official Documentation
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            DawaLens AI Operating Guide
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Your personal digital pharmacy manager. Safely track expiration dates, scan prescriptions using AI camera vision, receive automated email alerts, and check dangerous drug-drug interactions.
          </p>
        </div>

        {/* 1. Adding Medications */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Camera size={16} className="text-[#0f9d58]" />
            1. Adding & Scanning Medications
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            DawaLens AI offers two fast methods to input your medication inventory into your cloud vault:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
            <li>
              <strong className="text-slate-800">AI Prescription & Box Scanner:</strong> Tap the <strong className="text-[#0f9d58]">Scan</strong> button on the bottom navigation bar. Point your camera at any medication label, box, or blister strip. Our on-device vision model extracts medicine name, dosage strength, and expiration date automatically.
            </li>
            <li>
              <strong className="text-slate-800">Manual Entry with Suggestions:</strong> Tap <strong className="text-[#0f9d58]">Manual</strong> on the home view. Type the medicine name to see instant auto-fill suggestions. Select your dosage form (Tablet, Capsule, Syrup, Ampule, etc.), remaining quantity, and expiration date.
            </li>
          </ul>
        </section>

        {/* 2. Batch Management */}
        <section className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers size={16} className="text-[#0f9d58]" />
            2. Batch Tracking & Multiple Expirations
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            If you purchase multiple packs of the same medication over time with different expiry dates, DawaLens AI automatically groups them under a single card while tracking each batch individually:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
            <li><strong className="text-slate-800">FIFO Order (First In, First Out):</strong> The card displays the nearest expiring batch first so you know which one to use first.</li>
            <li><strong className="text-slate-800">Quick Deduct (-1):</strong> Tapping the minus button deducts from the nearest expiring batch automatically.</li>
            <li><strong className="text-slate-800">Expired Separation:</strong> Batches past their expiry date are moved into the dedicated Expired/Empty archive section.</li>
          </ul>
        </section>

        {/* 3. Drug Interactions */}
        <section className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle size={16} className="text-[#0f9d58]" />
            3. Drug Interactions & Clinical Assistant
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Tap the <strong className="text-slate-800">Assistant</strong> tab on your navigation bar to chat with our AI pharmacology assistant. Whenever you have 2 or more active medications, you can run the <strong>Check Interactions</strong> tool to screen for adverse contraindications, food-drug warnings, or duplicate therapies.
          </p>

          {/* Highlight Callout (Only where required) */}
          <div className="p-3.5 bg-amber-50/70 border-l-4 border-amber-500 rounded-r-xl text-xs text-amber-900 space-y-1">
            <span className="font-bold uppercase tracking-wider block">Important Clinical Notice</span>
            <p>AI interaction warnings and advice are for educational reference only. Never alter prescribed therapies without direct consultation with a licensed physician or pharmacist.</p>
          </div>
        </section>

        {/* 4. Expiry Notifications */}
        <section className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bell size={16} className="text-[#0f9d58]" />
            4. Expiry Notifications & Low Stock Alerts
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Never let medicines expire in your cabinet unnoticed. Configure automated alert schedules in your Profile Settings:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
            <li><strong className="text-slate-800">30 Days Warning:</strong> Early reminder for upcoming monthly refills.</li>
            <li><strong className="text-slate-800">60 Days Warning:</strong> Standard lead time for doctor appointments and renewals.</li>
            <li><strong className="text-slate-800">90 Days Warning:</strong> Quarterly audit for household emergency first-aid supplies.</li>
          </ul>
        </section>

        {/* 5. Privacy & Storage */}
        <section className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lock size={16} className="text-[#0f9d58]" />
            5. Data Privacy & Local Image Storage
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Prescription packaging images captured via your camera are stored strictly on-device in your browser's local IndexedDB cache and are never uploaded to remote servers. Account records are stored in your secure Firebase cloud vault and can be permanently deleted at any time via the <a href="/delete-account" className="text-[#0f9d58] font-semibold underline">Delete Account</a> page.
          </p>
        </section>

        {/* 6. Support & Contact */}
        <section className="pt-4 border-t border-slate-100 space-y-2">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail size={16} className="text-[#0f9d58]" />
            6. Support & Inquiries
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            For technical support, feature suggestions, or account assistance, email us at{' '}
            <a 
              href="mailto:mdnoor4860@gmail.com?subject=DawaLens%20AI%20Support" 
              className="text-[#0f9d58] font-bold hover:underline"
            >
              mdnoor4860@gmail.com
            </a>.
          </p>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-100 py-6 px-4 sm:px-8 mt-12 text-xs text-slate-500">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>&copy; 2026 DawaLens AI. Registered Domain: https://dawalens.vercel.app</div>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-[#0f9d58] font-semibold transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="/terms" className="hover:text-[#0f9d58] font-semibold transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="/delete-account" className="hover:text-rose-600 font-semibold transition-colors">Delete Account</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
