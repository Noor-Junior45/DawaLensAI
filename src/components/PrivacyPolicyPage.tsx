import React from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  Camera, 
  Trash2,
  Mail,
  CheckCircle2
} from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBack: () => void;
  isLoggedIn?: boolean;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
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
              <ShieldCheck size={18} className="text-[#0f9d58]" />
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Privacy Policy
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
            <CheckCircle2 size={11} /> Google OAuth & Play Store Compliance
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Privacy Policy & Data Protection
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Effective Date: June 25, 2026 • DawaLens AI ("we", "our", or "the Service") operates the digital pharmacy assistant application available at <strong>https://noorpos.in</strong>. This Privacy Policy details our standards regarding collection, handling, encryption, and deletion of user data in full adherence to the <strong>Google API Services User Data Policy</strong> (including Limited Use requirements) and the <strong>Google Play Store Data Safety Policy</strong>.
          </p>
        </div>

        {/* 1. Google User Data Handling */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lock size={16} className="text-[#0f9d58]" />
            1. Google User Data Handling (Limited Use)
          </h3>
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>
              <strong className="text-slate-800">A. Data Accessed:</strong> When you sign in using Google Authentication, we securely retrieve only your primary account identifiers: <strong>email address, display name, and profile avatar URL</strong>. We do NOT request access to contacts, Google Drive, Gmail messages, or external files.
            </p>
            <p>
              <strong className="text-slate-800">B. Data Purpose:</strong> Your profile data is used solely to authenticate your session, maintain your private medication records, and route automated expiration alerts to your designated email.
            </p>
            <p>
              <strong className="text-slate-800">C. No Model Training:</strong> None of your Google user data, profile information, or medication logs are ever used to train, fine-tune, or ground generic AI, machine learning, or large language models.
            </p>
            <p>
              <strong className="text-slate-800">D. Zero Sale of Data:</strong> We never sell, rent, trade, or transfer your Google user data to advertisers, data brokers, or marketing networks.
            </p>
          </div>
        </section>

        {/* 2. Camera & Photo Storage (Highlighted Callout) */}
        <section className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Camera size={16} className="text-[#0f9d58]" />
            2. Camera & Prescription Photo Privacy
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            When you use our camera scanning feature to capture medication boxes or prescription labels:
          </p>
          
          {/* Highlight Callout Box (Only where required) */}
          <div className="p-3.5 bg-emerald-50/70 border-l-4 border-[#0f9d58] rounded-r-xl text-xs text-emerald-900 space-y-1">
            <span className="font-bold uppercase tracking-wider block">100% On-Device Image Storage</span>
            <p>
              Scanned photos are saved exclusively on your physical device using your browser's sandboxed <strong>IndexedDB local storage</strong>. Camera photos are <strong>NEVER</strong> uploaded to remote cloud repositories or third-party servers.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            If you delete a medication log or clear your cache, the local photo is permanently wiped from your physical device storage.
          </p>
        </section>

        {/* 3. Google Analytics */}
        <section className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <EyeOff size={16} className="text-[#0f9d58]" />
            3. Google Analytics 4 Disclosure
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            We use Google Analytics 4 to collect aggregated, non-personally identifiable diagnostic events (such as button clicks, screen transitions, and performance diagnostics) to improve app stability. We strictly prohibit transmitting health identifiers, encryption keys, or prescription images to Google Analytics.
          </p>
        </section>

        {/* 4. Account Deletion */}
        <section className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trash2 size={16} className="text-[#0f9d58]" />
            4. Account & Data Deletion Rights
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            In compliance with the Google Play Store Data Safety & Account Deletion Policy, users can permanently wipe their account, stored medicines, and linked session tokens at any time via our <a href="/delete-account" className="text-[#0f9d58] font-bold underline">Delete Account</a> page. All records are permanently purged within 48 hours (instant if executed in-app).
          </p>
        </section>

        {/* 5. Contact & Privacy Officer */}
        <section className="pt-4 border-t border-slate-100 space-y-2">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail size={16} className="text-[#0f9d58]" />
            5. Contact Information
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            For questions regarding our privacy practices, GDPR compliance, or data subject requests, email us directly at{' '}
            <a 
              href="mailto:support@intgoi.resend.app?subject=Privacy%20Inquiry%20-%20DawaLens%20AI" 
              className="text-[#0f9d58] font-bold hover:underline"
            >
              dawalens@noorpos.in
            </a>.
          </p>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-100 py-6 px-4 sm:px-8 mt-12 text-xs text-slate-500">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>&copy; 2026 DawaLens AI. Registered Domain: https://noorpos.in</div>
          <div className="flex items-center gap-4">
            <a href="/manual" className="hover:text-[#0f9d58] font-semibold transition-colors">User Guide</a>
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
