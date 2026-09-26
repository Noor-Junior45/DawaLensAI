import React from 'react';
import { 
  ArrowLeft, 
  Scale, 
  ShieldAlert, 
  Mail, 
  CheckCircle2
} from 'lucide-react';

interface TermsOfServicePageProps {
  onBack: () => void;
  isLoggedIn?: boolean;
}

export const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onBack }) => {
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
              <Scale size={18} className="text-[#0f9d58]" />
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Terms of Service
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
            <CheckCircle2 size={11} /> Effective Date: June 25, 2026
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Terms of Service & Usage Agreement
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            These Terms of Service govern your access to and use of DawaLens AI services, website, and mobile client located at <strong>https://noorpos.in</strong>. By accessing our application or utilizing our medication tools, you agree to these terms.
          </p>
        </div>

        {/* Critical Medical Disclaimer (Highlighted Callout Box - Required) */}
        <div className="p-4 sm:p-5 bg-rose-50/70 border-l-4 border-rose-600 rounded-r-xl space-y-2">
          <div className="flex items-center gap-2 text-rose-800">
            <ShieldAlert size={18} />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">
              CRITICAL MEDICAL & CLINICAL DISCLAIMER
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-rose-900 leading-relaxed font-medium">
            <strong>DawaLens AI is an educational and personal organizational utility ONLY. It is NOT a clinical tool, medical device, or licensed medical professional.</strong> AI-generated summaries, OCR extractions, and drug interaction screenings may contain errors. NEVER modify, stop, or initiate any medical treatment without directly consulting your licensed doctor or pharmacist.
          </p>
        </div>

        {/* 1. Description of Service */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900">1. Description of Service</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            DawaLens AI provides medication inventory cataloging, expiration date tracking, daily dose intake recording, and AI-assisted drug interaction information for personal reference.
          </p>
        </section>

        {/* 2. Privacy & Photos */}
        <section className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">2. Privacy, Photos & Local Storage</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            We prioritize your privacy. All captured prescription packaging photos are processed strictly on your physical device via browser IndexedDB cache and are never transmitted to our remote servers. Handling of personal data is governed by our <a href="/privacy" className="text-[#0f9d58] font-bold underline">Privacy Policy</a>.
          </p>
        </section>

        {/* 3. User Responsibilities */}
        <section className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">3. User Responsibilities</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
            <li>You are responsible for verifying the accuracy of dosage strengths, frequencies, and expiration dates entered or scanned.</li>
            <li>You agree not to use the Service for any hazardous, fraudulent, or unlawful purpose.</li>
            <li>You may export your data or delete your account at any time via the automated deletion features.</li>
          </ul>
        </section>

        {/* 4. Limitation of Liability */}
        <section className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">4. Limitation of Liability</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            DawaLens AI is provided strictly "AS IS" without warranties of any kind. Under no circumstances shall DawaLens AI or its developers be held liable for any health complications, missed doses, adverse drug reactions, data inaccuracies, or indirect damages resulting from application usage.
          </p>
        </section>

        {/* 5. Contact Information */}
        <section className="pt-4 border-t border-slate-100 space-y-2">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail size={16} className="text-[#0f9d58]" />
            5. Legal & Contact Inquiries
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            For questions regarding these Terms or formal legal notices, contact us directly at{' '}
            <a 
              href="mailto:support@intgoi.resend.app?subject=Terms%20Inquiry%20-%20DawaLens%20AI" 
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
            <a href="/privacy" className="hover:text-[#0f9d58] font-semibold transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="/delete-account" className="hover:text-rose-600 font-semibold transition-colors">Delete Account</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
