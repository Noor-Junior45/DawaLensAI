import React from 'react';
import { 
  ArrowLeft, 
  Scale, 
  ShieldAlert, 
  Mail, 
  CheckCircle2, 
  BookOpen, 
  AlertTriangle, 
  ExternalLink, 
  UserCheck, 
  Clock, 
  Server, 
  Cpu, 
  Bell, 
  Camera, 
  Lock, 
  Ban, 
  FileText
} from 'lucide-react';
import { useEdgeSwipeBack } from '../utils/mobileGestures';
import { triggerLightHaptic } from '../utils/haptics';

interface TermsOfServicePageProps {
  onBack: () => void;
  isLoggedIn?: boolean;
}

export const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onBack }) => {
  useEdgeSwipeBack({ onBack });

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#2c2824] font-sans selection:bg-[#0f9d58] selection:text-white flex flex-col">
      {/* Sticky Clean Header with document tone */}
      <header className="sticky top-0 z-30 bg-[#faf6ee]/95 backdrop-blur-md border-b border-[#e7e0d2] px-3.5 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                triggerLightHaptic();
                onBack();
              }}
              className="p-2 hover:bg-[#ede5d6] rounded-full transition-colors text-[#57534e] active:scale-95 cursor-pointer"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2.5">
              <Scale size={22} className="text-[#0f9d58] shrink-0" />
              <h1 className="text-base sm:text-lg font-bold text-[#1c1917] tracking-tight">
                Terms of Service
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-[#57534e]">
            <a href="/privacy" className="hover:text-[#0f9d58] transition-colors">Privacy</a>
            <span>•</span>
            <a href="/delete-account" className="hover:text-rose-600 transition-colors">Delete Account</a>
          </div>
        </div>
      </header>

      {/* Main Legal Document Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* Legal Document Title & Formal Preamble */}
        <section className="space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#e5decb] pb-4 sm:pb-5 gap-2">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1c1917] tracking-tight leading-tight">
                Terms of Service &amp; Clinical Usage Agreement
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-[#78716c] uppercase tracking-wider mt-1.5">
                Ref: DAWASNAP-TOS-2026-V2.5 &bull; Governing Law: Republic of India
              </p>
            </div>
            <div className="text-xs sm:text-sm text-[#78716c] font-medium sm:text-right shrink-0">
              <div>Effective Date: October 3, 2026</div>
              <div>Last Revised: October 3, 2026</div>
            </div>
          </div>

          <div className="text-sm sm:text-base text-[#2c2824] space-y-3 leading-relaxed">
            <p>
              This Terms of Service and Clinical Usage Agreement (&ldquo;Terms&rdquo;, &ldquo;Agreement&rdquo;, or &ldquo;Terms of Use&rdquo;) is a binding legal contract between you (&ldquo;User&rdquo;, &ldquo;you&rdquo;, or &ldquo;your&rdquo;) and <strong>[TODO_USER_INPUT: OPERATOR_LEGAL_NAME (e.g. DawaSnap Technologies Private Limited)]</strong>, Operating Developer and Service Provider of <strong>DawaSnap AI</strong> (&ldquo;DawaSnap AI&rdquo;, &ldquo;Application&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
            </p>
            <p>
              DawaSnap AI is accessible as a native Android mobile application (Package: <code className="font-mono text-xs sm:text-sm bg-[#ede5d6] px-1.5 py-0.5 rounded text-[#1c1917] break-all">in.dawasnap.app</code>) and as a web application at{' '}
              <a href="https://noorpos.in" target="_blank" rel="noopener noreferrer" className="text-[#0f9d58] font-bold underline break-all">
                https://noorpos.in
              </a>{', '}
              <a href="https://dawasnap.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#0f9d58] font-bold underline break-all">
                https://dawasnap.vercel.app
              </a>{', and '}
              <a href="https://dawalensai.onrender.com" target="_blank" rel="noopener noreferrer" className="text-[#0f9d58] font-bold underline break-all">
                https://dawalensai.onrender.com
              </a>.
            </p>
            <p className="font-semibold text-[#1c1917]">
              BY ACCESSING, INSTALLING, REGISTERING, OR USING DAWASNAP AI, YOU EXPLICITLY ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREED TO BE BOUND BY ALL PROVISIONS OF THESE TERMS, INCLUDING THE MANDATORY CLINICAL DISCLAIMERS, ARBITRATION PROCEDURES, AND CLASS ACTION WAIVER.
            </p>
          </div>
        </section>

        {/* Quick Table of Contents / Index */}
        <section className="bg-[#f4eee1] border border-[#e2d9c8] rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-[#1c1917] text-xs sm:text-sm uppercase tracking-wider">
            <BookOpen size={17} className="text-[#0f9d58]" />
            Table of Sections &amp; Clauses
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm font-semibold text-[#2c2824]">
            <a href="#section-1" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center shrink-0">1</span>
              <span className="truncate">Section 1: Medical &amp; Clinical Disclaimers</span>
            </a>
            <a href="#section-2" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black flex items-center justify-center shrink-0">2</span>
              <span className="truncate">Section 2: AI &amp; Architecture Disclosures</span>
            </a>
            <a href="#section-3" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0">3</span>
              <span className="truncate">Section 3: Notifications &amp; Permissions</span>
            </a>
            <a href="#section-4" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-black flex items-center justify-center shrink-0">4</span>
              <span className="truncate">Section 4: User Eligibility &amp; Prohibitions</span>
            </a>
            <a href="#section-5" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f9d58] text-[10px] font-black flex items-center justify-center shrink-0">5</span>
              <span className="truncate">Section 5: Intellectual Property &amp; Data</span>
            </a>
            <a href="#section-6" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-amber-700 hover:border-amber-400 transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black flex items-center justify-center shrink-0">6</span>
              <span className="truncate">Section 6: Disclaimer of Warranties</span>
            </a>
            <a href="#section-7" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-rose-700 hover:border-rose-400 transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center shrink-0">7</span>
              <span className="truncate">Section 7: Limitation of Liability</span>
            </a>
            <a href="#section-8" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f9d58] text-[10px] font-black flex items-center justify-center shrink-0">8</span>
              <span className="truncate">Section 8: Dispute Resolution &amp; Jurisdiction</span>
            </a>
            <a href="#section-9" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-black flex items-center justify-center shrink-0">9</span>
              <span className="truncate">Section 9: Amendments &amp; Severability</span>
            </a>
            <a href="#section-10" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-black flex items-center justify-center shrink-0">10</span>
              <span className="truncate">Section 10: Legal Grievance Redressal</span>
            </a>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* SECTION 1 */}
        <section id="section-1" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-900 text-xs sm:text-sm font-black shrink-0">1.0</span>
            <h3 className="tracking-tight text-rose-950">CRITICAL MEDICAL &amp; CLINICAL DISCLAIMERS</h3>
          </div>

          <div className="border-l-4 border-rose-600 bg-[#fff5f5] border border-rose-200/90 p-4 sm:p-5 rounded-r-xl space-y-3 text-sm sm:text-base text-rose-950 leading-relaxed shadow-2xs">
            <div className="font-extrabold uppercase tracking-wider text-rose-900 text-xs sm:text-sm flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-600 shrink-0" />
              Mandatory Google Play Health Apps Declaration
            </div>
            <p className="font-bold text-[#1c1917]">
              DAWASNAP AI IS STRICTLY AN INFORMATIONAL, EDUCATIONAL, AND PERSONAL INVENTORY MANAGEMENT TOOL. IT IS NOT A CERTIFIED MEDICAL DEVICE, DIAGNOSTIC SOFTWARE, CLINICAL DECISION SUPPORT SYSTEM, OR PRESCRIPTION DISPENSING PLATFORM.
            </p>
            <ul className="list-disc pl-4 sm:pl-5 space-y-2 text-rose-950 font-medium">
              <li>
                <strong>1.1 Absence of Doctor-Patient Relationship:</strong> No confidential doctor-patient, pharmacist-patient, or healthcare professional relationship is formed between you and DawaSnap AI or its developer. All outputs, optical scans, interaction checks, and automated AI summaries are generated algorithmically for educational reference only.
              </li>
              <li>
                <strong>1.2 Mandatory Professional Consultation:</strong> Never alter prescribed drug dosages, discontinue essential medical treatments, or disregard certified clinical guidance based on information displayed in the application. Always consult your licensed physician, hospital doctor, or certified pharmacist.
              </li>
              <li>
                <strong>1.3 Verification of Packaging &amp; Expiration:</strong> Optical character recognition (OCR) and computer vision algorithms may misinterpret damaged labels, metallic foil glare, or embossed text. You maintain the sole, personal responsibility to visually verify all medication names, dosages, and expiration dates against the physical package before consumption.
              </li>
              <li>
                <strong>1.4 Emergency Protocols:</strong> DawaSnap AI is not an emergency triage service. In acute life-threatening situations, anaphylaxis, or accidental poisonings, immediately call emergency services:
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-1 font-mono text-xs text-rose-900 font-bold">
                  <div className="bg-rose-100/70 p-2 rounded border border-rose-200 text-center">India: 112 / 108</div>
                  <div className="bg-rose-100/70 p-2 rounded border border-rose-200 text-center">USA/Canada: 911</div>
                  <div className="bg-rose-100/70 p-2 rounded border border-rose-200 text-center">UK: 999 / 111</div>
                  <div className="bg-rose-100/70 p-2 rounded border border-rose-200 text-center">EU: 112</div>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* SECTION 2 */}
        <section id="section-2" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 text-xs sm:text-sm font-black shrink-0">2.0</span>
            <h3 className="tracking-tight">AI &amp; THIRD-PARTY ARCHITECTURE DISCLOSURES</h3>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <p>
              DawaSnap AI incorporates a hybrid dual-layer artificial intelligence infrastructure designed for high pharmacological precision and privacy isolation:
            </p>

            <div className="border-l-4 border-purple-600 bg-[#f9f5fc] border border-purple-200/80 p-4 rounded-r-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-purple-950 text-sm sm:text-base">
                <Server size={18} className="text-purple-600 shrink-0" />
                Cloud Reasoning: Google AI Studio Gemini API (Free Tier Terms)
              </div>
              <p className="text-[#44403c]">
                For complex clinical queries, multidrug regimens, and interaction analyses, the application interfaces with Google AI Studio Gemini models (<code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">gemini-2.5-flash</code>). All queries are transmitted over encrypted TLS 1.3 channels. No Personally Identifiable Information (PII) such as user name, email, or Firebase UID is ever transmitted in prompt payloads.
              </p>
            </div>

            <div className="border-l-4 border-[#0f9d58] bg-[#f5f8f5] border border-[#d2e7d7] p-4 rounded-r-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#1c1917] text-sm sm:text-base">
                <Cpu size={18} className="text-[#0f9d58] shrink-0" />
                On-Device Clinical Reference Engine &amp; Heuristic Packaging Classifier
              </div>
              <p className="text-[#44403c]">
                For offline access and instant response times, DawaSnap AI embeds an on-device, rule-based clinical pharmacology reference engine and heuristic packaging classifier. The reference engine operates completely locally in device RAM. <strong>Strict Zero-Training Guarantee:</strong> User conversations, scanned medications, and adherence logs are NEVER collected, stored, or utilized to train or fine-tune artificial intelligence models.
              </p>
            </div>

            <div className="bg-[#f5efe4] border border-[#e2d9c8] rounded-xl p-4 space-y-2 text-xs sm:text-sm">
              <span className="font-bold text-[#1c1917] flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-amber-600" /> Probabilistic Hallucination Warning:
              </span>
              <p className="text-[#44403c]">
                Large language models generate probabilistic responses. While grounded in clinical compendia, AI responses may occasionally contain errors, outdated drug formulations, or algorithmic hallucinations. You agree to treat all AI Pharmacist responses as supplementary educational overviews rather than clinical mandates.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* SECTION 3 */}
        <section id="section-3" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 text-xs sm:text-sm font-black shrink-0">3.0</span>
            <h3 className="tracking-tight">HARDWARE PERMISSION &amp; NOTIFICATION USE</h3>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <p>
              In compliance with Google Play Store Policies, permissions are invoked solely when required for direct user features and medication tracking:
            </p>

            <div className="border-l-4 border-blue-600 bg-[#f4f7fa] border border-[#d3dfed] p-4 rounded-r-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#1c1917] text-sm sm:text-base flex-wrap">
                <Bell size={18} className="text-blue-600 shrink-0" />
                <code className="font-mono text-xs sm:text-sm bg-[#ede5d6] px-1.5 py-0.5 rounded text-[#1c1917]">android.permission.POST_NOTIFICATIONS</code>
              </div>
              <p className="text-[#44403c]">
                <strong>Notification Delivery:</strong> Used solely to alert you on-device when medications are nearing expiration (at 30 days, 7 days, and on expiration day) or require refills. DawaSnap AI schedules notifications through standard Android notification channels and does not request or require restricted exact alarm permissions (<code>SCHEDULE_EXACT_ALARM</code>). Notifications contain no commercial advertisements.
              </p>
            </div>

            <div className="border-l-4 border-[#0f9d58] bg-[#f5f8f5] border border-[#d2e7d7] p-4 rounded-r-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#1c1917] text-sm sm:text-base flex-wrap">
                <Camera size={18} className="text-[#0f9d58] shrink-0" />
                <code className="font-mono text-xs sm:text-sm bg-[#ede5d6] px-1.5 py-0.5 rounded text-[#1c1917]">CAMERA</code> &amp; Local Storage Isolation
              </div>
              <p className="text-[#44403c]">
                Invoked solely when scanning packaging labels. Captured photos saved into your vault are stored locally in your physical device&apos;s sandboxed <code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">IndexedDB</code> storage (<code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">DawaSnapLocalImages</code>) and are never uploaded to remote database disks. During active scanning, packaging photos are streamed over secure HTTPS to Google Gemini for optical text extraction.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* SECTION 4 */}
        <section id="section-4" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-stone-200 text-stone-800 text-xs sm:text-sm font-black shrink-0">4.0</span>
            <h3 className="tracking-tight">USER ELIGIBILITY &amp; PROHIBITED CONDUCT</h3>
          </div>

          <div className="space-y-3 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <p>
              <strong>4.1 Eligibility:</strong> You must be at least 18 years of age or the legal age of majority in your jurisdiction. Minors aged 13 to 17 may use the service only under active parental or guardian supervision. Children under 13 are strictly prohibited from using DawaSnap AI.
            </p>
            <p>
              <strong>4.2 Prohibited Activities:</strong> In using DawaSnap AI, you strictly agree NOT to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#44403c]">
              <li>Decompile, reverse engineer, unpack, or copy algorithmic heuristics or client code.</li>
              <li>Deploy automated scrapers, crawlers, or bots to harvest pharmaceutical data or strain our backend proxy endpoints.</li>
              <li>Use the application to conduct unlicensed telemedicine, commercial clinical triage, prescription forgery, or illicit drug distribution.</li>
              <li>Circumvent or attempt to disable security boundaries, authentication tokens, rate limits, or Firebase Firestore security rules.</li>
            </ul>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* SECTION 5 */}
        <section id="section-5" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-[#0f9d58] text-xs sm:text-sm font-black shrink-0">5.0</span>
            <h3 className="tracking-tight">INTELLECTUAL PROPERTY &amp; DATA HANDLING</h3>
          </div>

          <div className="space-y-3 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <p>
              <strong>5.1 Intellectual Property Ownership:</strong> All code, user interfaces, branding, vector artwork, Doctor Logo, and algorithmic heuristic rules are the exclusive property of <strong>[TODO_USER_INPUT: OPERATOR_LEGAL_NAME (e.g. DawaSnap Technologies Private Limited)]</strong>.
            </p>
            <p>
              <strong>5.2 User Data Ownership &amp; Privacy:</strong> You retain complete ownership of your personal health data, medication entries, notes, and photos. We process your data strictly under the terms of our active <a href="/privacy" className="text-[#0f9d58] font-bold underline">Privacy Policy</a>.
            </p>
            <p>
              <strong>5.3 Account &amp; Data Deletion:</strong> You have the unconditional right to erase all your cloud documents and local device image caches immediately via our in-app settings or via our dedicated web portal at{' '}
              <a href="https://dawasnap.vercel.app/delete-account" target="_blank" rel="noopener noreferrer" className="text-rose-600 font-bold underline break-all">
                https://dawasnap.vercel.app/delete-account <ExternalLink size={13} className="inline" />
              </a>.
            </p>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* SECTION 6 */}
        <section id="section-6" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs sm:text-sm font-black shrink-0">6.0</span>
            <h3 className="tracking-tight text-amber-950">COMPREHENSIVE DISCLAIMER OF WARRANTIES ("AS IS")</h3>
          </div>

          <div className="border-l-4 border-amber-600 bg-[#fef8eb] border border-amber-200/90 p-4 sm:p-5 rounded-r-xl space-y-3 text-xs sm:text-sm text-amber-950 leading-relaxed font-mono">
            <p className="font-bold uppercase text-amber-900">
              TO THE FULLEST EXTENT PERMISSIBLE BY APPLICABLE LAW:
            </p>
            <p>
              DAWASNAP AI, ITS ENTIRE CODEBASE, ON-DEVICE OCR SCANNERS, DRUG INTERACTION CALCULATORS, SCHEDULE ALERTS, AND AI PHARMACIST OUTPUTS ARE PROVIDED STRICTLY ON AN <strong>&ldquo;AS IS&rdquo;</strong> AND <strong>&ldquo;AS AVAILABLE&rdquo;</strong> BASIS, WITHOUT WARRANTIES OR GUARANTEES OF ANY KIND, EITHER EXPRESS, STATUTORY, OR IMPLIED.
            </p>
            <p>
              [TODO_USER_INPUT: OPERATOR_LEGAL_NAME] AND DAWASNAP AI EXPRESSLY DISCLAIM ALL IMPLIED WARRANTIES, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, ACCURACY, FREEDOM FROM PROGRAMMING ERRORS, OR FREEDOM FROM OPERATING SYSTEM NOTIFICATION DELAYS CAUSED BY MANUFACTURER BATTERY-SAVING MODES.
            </p>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* SECTION 7 */}
        <section id="section-7" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-900 text-xs sm:text-sm font-black shrink-0">7.0</span>
            <h3 className="tracking-tight text-rose-950">LIMITATION OF LIABILITY &amp; FINANCIAL CAP</h3>
          </div>

          <div className="space-y-3 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <p className="font-semibold text-[#1c1917]">
              7.1 Exclusion of Health &amp; Consequential Damages:
            </p>
            <p className="text-[#44403c]">
              Under no legal theory (contract, tort, negligence, or strict liability) shall [TODO_USER_INPUT: OPERATOR_LEGAL_NAME] or DawaSnap AI be liable for any personal injury, adverse drug event, pharmaceutical allergic reaction, missed dose, accidental ingestion of expired medication, death, or indirect damages resulting from your use of or reliance upon the application.
            </p>
            <div className="bg-[#fdf4f4] border-l-4 border-rose-600 border border-rose-200 p-4 rounded-r-xl text-xs sm:text-sm text-rose-950 font-bold">
              7.2 Strict Financial Liability Cap:
              <div className="font-normal text-rose-900 mt-1">
                IN NO EVENT SHALL OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THIS SERVICE EXCEED THE AMOUNT PAID BY YOU TO DAWASNAP AI IN THE PRECEDING TWELVE (12) MONTHS OR THE SUM OF <strong>₹4,200 INR (FOUR THOUSAND TWO HUNDRED RUPEES) / $50.00 USD</strong>, WHICHEVER IS LESS.
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* SECTION 8 */}
        <section id="section-8" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-[#0f9d58] text-xs sm:text-sm font-black shrink-0">8.0</span>
            <h3 className="tracking-tight">GOVERNING LAW, JURISDICTION &amp; CLASS ACTION WAIVER</h3>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <div className="bg-[#f5efe4] border border-[#e2d9c8] p-4 rounded-xl space-y-2">
              <div className="font-bold text-[#1c1917] flex items-center gap-2">
                <Scale size={18} className="text-[#0f9d58]" />
                8.1 Governing Law &amp; Exclusive Jurisdiction:
              </div>
              <p className="text-[#44403c]">
                These Terms shall be governed by and construed in accordance with the substantive laws of the <strong>Republic of India</strong> (including the Indian Contract Act, 1872 and the DPDP Act, 2023). You and [TODO_USER_INPUT: OPERATOR_LEGAL_NAME] irrevocably agree that any dispute or lawsuit arising hereunder shall be subject to the exclusive personal and subject-matter jurisdiction of the <strong>Competent Civil Courts in Kolkata, West Bengal, India</strong>.
              </p>
            </div>

            <div className="bg-[#f5efe4] border border-[#e2d9c8] p-4 rounded-xl space-y-2">
              <div className="font-bold text-[#1c1917] flex items-center gap-2">
                <Clock size={18} className="text-[#0f9d58]" />
                8.2 Mandatory 30-Day Informal Negotiation:
              </div>
              <p className="text-[#44403c]">
                Before filing any formal legal claim, you agree to submit a written notice to <code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">[TODO_USER_INPUT: CONTACT_EMAIL]</code> and negotiate in good faith for thirty (30) days to reach an amicable resolution.
              </p>
            </div>

            <div className="border-l-4 border-rose-500 bg-[#fff5f5] border border-rose-200 p-4 rounded-r-xl text-xs sm:text-sm text-rose-950 font-bold space-y-1">
              <div>8.3 Express Class Action Waiver:</div>
              <p className="font-normal text-rose-900">
                ALL CLAIMS MUST BE BROUGHT IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* SECTION 9 & 10 */}
        <section id="section-10" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-stone-200 text-stone-800 text-xs sm:text-sm font-black shrink-0">10.0</span>
            <h3 className="tracking-tight">STATUTORY GRIEVANCE REDRESSAL &amp; LEGAL CONTACT</h3>
          </div>

          <div className="border border-[#ded6c5] rounded-xl overflow-hidden bg-[#fdfbf7] shadow-xs">
            <div className="bg-[#ede5d6] px-4 py-2.5 border-b border-[#ded6c5] flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-[#1c1917] text-xs sm:text-sm md:text-base">
                <UserCheck size={18} className="text-[#0f9d58] shrink-0" />
                <span>Statutory Compliance &amp; Grievance Officer</span>
              </div>
              <span className="text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0f9d58] tracking-wider uppercase">
                IT Rules 2021 &bull; DPDP Act 2023
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm md:text-base text-left border-collapse">
                <tbody className="divide-y divide-[#e8e1d3] text-[#2c2824]">
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <th scope="row" className="py-3 px-3.5 sm:px-4 font-semibold text-[#57534e] w-[32%] sm:w-48 shrink-0 align-middle bg-[#f6f0e4]">
                      Service Provider
                    </th>
                    <td className="py-3 px-3.5 sm:px-4 font-bold text-[#1c1917] align-middle">
                      [TODO_USER_INPUT: OPERATOR_LEGAL_NAME (e.g. DawaSnap Technologies Private Limited)]
                    </td>
                  </tr>
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <th scope="row" className="py-3 px-3.5 sm:px-4 font-semibold text-[#57534e] w-[32%] sm:w-48 shrink-0 align-middle bg-[#f6f0e4]">
                      Grievance Officer
                    </th>
                    <td className="py-3 px-3.5 sm:px-4 text-[#2c2824] font-medium align-middle">
                      [TODO_USER_INPUT: GRIEVANCE_OFFICER_NAME] ([TODO_USER_INPUT: GRIEVANCE_OFFICER_DESIGNATION])
                    </td>
                  </tr>
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <th scope="row" className="py-3 px-3.5 sm:px-4 font-semibold text-[#57534e] w-[32%] sm:w-48 shrink-0 align-middle bg-[#f6f0e4]">
                      Official Contact Email
                    </th>
                    <td className="py-3 px-3.5 sm:px-4 align-middle">
                      <span className="text-[#0f9d58] font-bold underline break-all inline-flex items-center gap-1">
                        [TODO_USER_INPUT: GRIEVANCE_OFFICER_EMAIL]
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <th scope="row" className="py-3 px-3.5 sm:px-4 font-semibold text-[#57534e] w-[32%] sm:w-48 shrink-0 align-middle bg-[#f6f0e4]">
                      Postal Address
                    </th>
                    <td className="py-3 px-3.5 sm:px-4 text-[#2c2824] font-medium align-middle">
                      [TODO_USER_INPUT: GRIEVANCE_OFFICER_POSTAL_ADDRESS]
                    </td>
                  </tr>
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <th scope="row" className="py-3 px-3.5 sm:px-4 font-semibold text-[#57534e] w-[32%] sm:w-48 shrink-0 align-middle bg-[#f6f0e4]">
                      <span className="flex items-center gap-1.5">
                        <Clock size={15} className="text-[#0f9d58] shrink-0" />
                        Statutory SLA
                      </span>
                    </th>
                    <td className="py-3 px-3.5 sm:px-4 text-[#2c2824] align-middle leading-snug">
                      <span className="inline-block">Ack within <strong>24 hours</strong></span>
                      <span className="mx-2 text-[#a8a29e]">&bull;</span>
                      <span className="inline-block">Resolution within <strong>30 calendar days</strong></span>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <th scope="row" className="py-3 px-3.5 sm:px-4 font-semibold text-[#57534e] w-[32%] sm:w-48 shrink-0 align-middle bg-[#f6f0e4]">
                      Permanent Deletion Portal
                    </th>
                    <td className="py-3 px-3.5 sm:px-4 align-middle">
                      <a href="https://dawasnap.vercel.app/delete-account" target="_blank" rel="noopener noreferrer" className="text-rose-600 font-bold underline break-all">
                        https://dawasnap.vercel.app/delete-account
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5decb] bg-[#faf6ee] py-6 px-4 sm:px-8 mt-12 text-xs text-[#78716c]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>&copy; 2026 DawaSnap AI &bull; Ref: DAWASNAP-TOS-2026-V2.5</div>
          <div className="flex items-center gap-4">
            <a href="/" className="hover:text-[#0f9d58] font-semibold transition-colors">Home</a>
            <span>•</span>
            <a href="/guide" className="hover:text-[#0f9d58] font-semibold transition-colors">User Guide</a>
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
