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
  Sparkles,
  Pill,
  CheckCircle2,
  Clock,
  ShieldAlert,
  FileText,
  Database,
  Cpu,
  ExternalLink
} from 'lucide-react';
import { useEdgeSwipeBack } from '../utils/mobileGestures';
import { triggerLightHaptic } from '../utils/haptics';

interface UserGuidePageProps {
  onBack: () => void;
  isLoggedIn?: boolean;
}

export const UserGuidePage: React.FC<UserGuidePageProps> = ({ onBack }) => {
  useEdgeSwipeBack({ onBack });

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#2c2824] font-sans selection:bg-[#0f9d58] selection:text-white flex flex-col">
      {/* Sticky Clean Header with soft document tone */}
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
              <BookOpen size={22} className="text-[#0f9d58] shrink-0" />
              <h1 className="text-base sm:text-lg font-bold text-[#1c1917] tracking-tight">
                User Guide &amp; Operating Manual
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-[#57534e]">
            <a href="/privacy" className="hover:text-[#0f9d58] transition-colors">Privacy</a>
            <span>•</span>
            <a href="/terms" className="hover:text-[#0f9d58] transition-colors">Terms</a>
            <span>•</span>
            <a href="/delete-account" className="hover:text-rose-600 transition-colors">Delete Account</a>
          </div>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* Title Header */}
        <section className="space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#e5decb] pb-4 sm:pb-5 gap-2">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#0f9d58] border border-emerald-200">
                <Sparkles size={13} /> Official Documentation &bull; Version 2.5
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1c1917] tracking-tight leading-tight mt-2.5">
                DawaSnap AI Operating Guide
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-[#78716c] font-medium sm:text-right shrink-0">
              <div>Ref: DAWASNAP-GUIDE-2026-V2.5</div>
              <div>Updated: October 3, 2026</div>
            </div>
          </div>

          <p className="text-sm sm:text-base text-[#2c2824] leading-relaxed">
            Welcome to <strong>DawaSnap AI</strong>, your personal medication inventory vault, expiration monitoring companion, and personal digital pharmacist. This comprehensive manual details all scanning techniques, batch inventory rules, alarm configurations, and AI safety tools.
          </p>
        </section>

        {/* Quick Table of Contents / Index */}
        <section className="bg-[#f4eee1] border border-[#e2d9c8] rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-[#1c1917] text-xs sm:text-sm uppercase tracking-wider">
            <BookOpen size={17} className="text-[#0f9d58]" />
            Operating Guide Index
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm font-semibold text-[#2c2824]">
            <a href="#guide-scanning" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f9d58] text-[10px] font-black flex items-center justify-center shrink-0">1</span>
              <span className="truncate">1. AI Camera Scanning &amp; OCR</span>
            </a>
            <a href="#guide-manual" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0">2</span>
              <span className="truncate">2. Manual Entry &amp; Dosage Forms</span>
            </a>
            <a href="#guide-batch" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black flex items-center justify-center shrink-0">3</span>
              <span className="truncate">3. FIFO Batch Inventory &amp; Vault</span>
            </a>
            <a href="#guide-alerts" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black flex items-center justify-center shrink-0">4</span>
              <span className="truncate">4. Expiration Alerts &amp; Safe Disposal</span>
            </a>
            <a href="#guide-alarms" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f9d58] text-[10px] font-black flex items-center justify-center shrink-0">5</span>
              <span className="truncate">5. Expiry &amp; Dose Notifications</span>
            </a>
            <a href="#guide-interactions" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center shrink-0">6</span>
              <span className="truncate">6. Drug Interaction Screener</span>
            </a>
            <a href="#guide-assistant" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-black flex items-center justify-center shrink-0">7</span>
              <span className="truncate">7. AI Pharmacist ("Dr. DawaSnap")</span>
            </a>
            <a href="#guide-privacy" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-black flex items-center justify-center shrink-0">8</span>
              <span className="truncate">8. Data Privacy &amp; Account Deletion</span>
            </a>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* 1. SCANNING */}
        <section id="guide-scanning" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-[#0f9d58] text-xs sm:text-sm font-black shrink-0">1.0</span>
            <h3 className="tracking-tight">Adding Medications via AI Camera Scanning</h3>
          </div>

          <div className="border-l-4 border-[#0f9d58] bg-[#f5f8f5] border border-[#d2e7d7] p-4 sm:p-5 rounded-r-xl space-y-3 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-[#1c1917]">
              <Camera size={18} className="text-[#0f9d58] shrink-0" />
              Scanning Best Practices for Accurate Label Extraction
            </div>
            <p>
              DawaSnap AI features an advanced multi-tier vision and OCR pipeline capable of reading printed cartons, syrup bottles, and shiny embossed foil blister packs:
            </p>
            <ul className="list-disc pl-4 sm:pl-5 space-y-2 text-[#44403c]">
              <li>
                <strong>Foil Blister Packs:</strong> Tilt the foil strip at a slight 45-degree angle under lighting so shadows highlight embossed expiry digits (<code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">EXP</code>, <code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">BB</code>, or <code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">B.No</code>). Our in-memory contrast filter suppresses glare automatically.
              </li>
              <li>
                <strong>Bottles &amp; Syrups:</strong> Position the front trade label inside the viewfinder rectangle so the brand name (e.g. <em>Augmentin 625 Duo</em>, <em>Calpol 250</em>) and volume (<code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">100ml</code>) are clear.
              </li>
              <li>
                <strong>Automatic Recognition:</strong> The camera detects the medicine brand name, dosage strength, normalized expiration date (<code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">YYYY-MM-01</code>), and pack quantity (using packaging analysis).
              </li>
              <li>
                <strong>100% Offline Capability:</strong> If you are offline, scanning falls back seamlessly to client-side <strong>Tesseract.js (Wasm)</strong> and our on-device Small Language Model without requiring any internet connection.
              </li>
            </ul>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* 2. MANUAL ENTRY */}
        <section id="guide-manual" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 text-xs sm:text-sm font-black shrink-0">2.0</span>
            <h3 className="tracking-tight">Manual Medicine Entry &amp; Dosage Forms</h3>
          </div>

          <div className="space-y-3 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <p>
              If your medication packaging is damaged or you prefer direct entry:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-[#44403c]">
              <li>Tap the green <strong>+ Add Medicine</strong> button on the home screen.</li>
              <li>
                <strong>Clinical Autocomplete:</strong> Type the first few letters of the trade or generic salt name. The app queries a built-in compendium of 150+ standard formulations in real-time.
              </li>
              <li>
                <strong>Dosage Form Classification:</strong> Select the accurate formulation form:
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 font-mono text-xs text-[#1c1917]">
                  <div className="bg-[#ede5d6]/60 p-2 rounded text-center">💊 Tablet</div>
                  <div className="bg-[#ede5d6]/60 p-2 rounded text-center">💊 Capsule</div>
                  <div className="bg-[#ede5d6]/60 p-2 rounded text-center">🧴 Syrup / Liquid</div>
                  <div className="bg-[#ede5d6]/60 p-2 rounded text-center">💉 Ampule / Vial</div>
                  <div className="bg-[#ede5d6]/60 p-2 rounded text-center">📦 Powder / ORS</div>
                  <div className="bg-[#ede5d6]/60 p-2 rounded text-center">🩹 Tape / Patch</div>
                  <div className="bg-[#ede5d6]/60 p-2 rounded text-center">💧 Topical Wash</div>
                  <div className="bg-[#ede5d6]/60 p-2 rounded text-center">🌿 Other (Drops/Ointment)</div>
                </div>
              </li>
              <li>Enter the remaining unit quantity and set the expiration date.</li>
              <li>Enable custom <strong>Low-Stock Alert</strong> thresholds and email alert toggles as desired.</li>
            </ol>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* 3. BATCH & FIFO */}
        <section id="guide-batch" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 text-xs sm:text-sm font-black shrink-0">3.0</span>
            <h3 className="tracking-tight">FIFO Batch Tracking &amp; Vault Management</h3>
          </div>

          <div className="space-y-3 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <div className="border-l-4 border-purple-600 bg-[#f9f5fc] border border-purple-200/80 p-4 rounded-r-xl space-y-2">
              <div className="font-bold text-purple-950 flex items-center gap-2">
                <Layers size={18} className="text-purple-600" />
                First-In, First-Out (FIFO) Batch Deduction
              </div>
              <p className="text-[#44403c]">
                When you buy multiple packs of the same medication over time with different expiry dates, DawaSnap AI groups them under one unified card while tracking each batch separately. Tapping the <strong>-1 button</strong> automatically deducts pills from the nearest expiring batch first so earlier stock is consumed before opening fresh packs.
              </p>
            </div>

            <p>
              <strong>Category Filters:</strong> Use the top category selector to filter your inventory by clinical department: <em>Heart, Pain Relief, Antibiotics, Diabetes, Vitamins, Digestive, Allergy, Respiratory, Mental Health, Skin Care, or Eye &amp; Ear</em>.
            </p>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* 4. EXPIRY & SAFE DISPOSAL */}
        <section id="guide-alerts" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs sm:text-sm font-black shrink-0">4.0</span>
            <h3 className="tracking-tight text-amber-950">Expiration Alert Lifecycle &amp; Safe Chemical Disposal</h3>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <p>
              DawaSnap AI runs an automated background cron worker 24/7 on the server to dispatch time-critical safety warnings directly to your verified email:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#fffbeb] border border-[#fde68a] p-3.5 rounded-xl space-y-1">
                <span className="font-bold text-[#b45309] text-xs uppercase block">Stage 1: 1 Month Notice</span>
                <p className="text-xs text-[#78350f]">Dispatched 30–31 days before expiration. Gives advance notice to plan renewals or schedule clinic appointments.</p>
              </div>
              <div className="bg-[#fff7ed] border border-[#fdba74] p-3.5 rounded-xl space-y-1">
                <span className="font-bold text-[#c2410c] text-xs uppercase block">Stage 2: 7 Days Warning</span>
                <p className="text-xs text-[#7c2d12]">Dispatched exactly 7 days before expiry. Urgent alert to finish therapy or obtain fresh refills.</p>
              </div>
              <div className="bg-[#fef2f2] border border-[#fca5a5] p-3.5 rounded-xl space-y-1">
                <span className="font-bold text-[#b91c1c] text-xs uppercase block">Stage 3: Expired Advisory</span>
                <p className="text-xs text-[#7f1d1d]">Dispatched on or immediately after expiry. <strong>DO NOT CONSUME.</strong> Includes safe disposal steps.</p>
              </div>
            </div>

            <div className="border-l-4 border-amber-600 bg-[#fef8eb] border border-amber-200 p-4 rounded-r-xl text-xs sm:text-sm text-amber-950 space-y-1">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-900">
                <AlertTriangle size={15} /> Safe Chemical Disposal Guidelines
              </span>
              <p>
                Never flush expired antibiotics or hormones down toilets or sinks, as they contaminate municipal waterways. Participate in pharmacy take-back drop-off programs, or mix unwanted pills with coffee grounds or soil in a sealed pouch before household disposal.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* 5. SCHEDULED NOTIFICATIONS */}
        <section id="guide-alarms" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-[#0f9d58] text-xs sm:text-sm font-black shrink-0">5.0</span>
            <h3 className="tracking-tight">Scheduled Expiry &amp; Dose Notifications</h3>
          </div>

          <div className="space-y-3 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <p>
              DawaSnap AI delivers timely medication alerts on Android and modern web browsers without requiring restricted exact alarm permissions:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#44403c]">
              <li>
                <strong>Multi-Stage Expiration Alerts:</strong> Automatic alerts are scheduled on your device at 30 days before expiration, 7 days before expiration, and on the expiration day itself.
              </li>
              <li>
                <strong>Battery Optimization Advice:</strong> To prevent Android battery cleaners from delaying notification delivery, open your phone&apos;s <strong>Settings &rarr; Apps &rarr; DawaSnap AI &rarr; Battery &rarr; Select "Unrestricted"</strong>.
              </li>
            </ul>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* 6. DRUG INTERACTIONS */}
        <section id="guide-interactions" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-900 text-xs sm:text-sm font-black shrink-0">6.0</span>
            <h3 className="tracking-tight text-rose-950">Drug-Drug Interaction Checker</h3>
          </div>

          <div className="space-y-3 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <p>
              When taking two or more medications simultaneously, select <strong>Check Interactions</strong> in the navigation bar:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#44403c]">
              <li>
                <strong>Severity Ratings:</strong> Interaction reports classify conflicts into 🟢 Low, 🟡 Moderate, or 🔴 High clinical severity.
              </li>
              <li>
                <strong>Clinical Mechanism &amp; Action Plan:</strong> Explains the biological conflict (e.g., increased bleeding risk with blood thinners, competing liver enzymes) and provides talking points to bring to your doctor.
              </li>
            </ul>
            <div className="p-3.5 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl text-xs text-rose-950 font-medium">
              <strong>Clinical Advisory:</strong> AI interaction warnings are for personal education only. Never discontinue essential maintenance therapies without direct medical authorization.
            </div>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* 7. AI PHARMACIST */}
        <section id="guide-assistant" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-stone-200 text-stone-800 text-xs sm:text-sm font-black shrink-0">7.0</span>
            <h3 className="tracking-tight">AI Pharmacist ("Dr. DawaSnap")</h3>
          </div>

          <div className="space-y-3 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <p>
              Tap the <strong>Assistant</strong> tab anytime for 24/7 empathetic, evidence-based medication guidance:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#44403c]">
              <li>
                <strong>Vault Awareness:</strong> When you ask <em>"What do I have for a headache?"</em>, Dr. DawaSnap checks your actual stored medicines before recommending standard alternatives.
              </li>
              <li>
                <strong>Native Hinglish Support:</strong> Dr. DawaSnap natively speaks and understands Hinglish (e.g. <em>"Aapko ye Paracetamol din mein do baar khana khane ke baad leni hai"</em>).
              </li>
              <li>
                <strong>Consultation Reports:</strong> Tap <strong>Send Consultation Report</strong> to dispatch a structured summary of your consultation and active medicine list directly to your verified email and in-app Treatment Mailbox.
              </li>
            </ul>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* 8. PRIVACY & DELETION */}
        <section id="guide-privacy" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-stone-200 text-stone-800 text-xs sm:text-sm font-black shrink-0">8.0</span>
            <h3 className="tracking-tight">Data Privacy, Local Storage &amp; Account Erasure</h3>
          </div>

          <div className="space-y-3 text-sm sm:text-base text-[#2c2824] leading-relaxed">
            <p>
              DawaSnap AI follows a strict privacy-first architecture under the India DPDP Act 2023 and GDPR:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#44403c]">
              <li>
                <strong>Zero Cloud Photos:</strong> Camera images saved in your vault are stored 100% locally in your physical device&apos;s sandboxed <code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">IndexedDB</code> and are NEVER uploaded to cloud storage buckets.
              </li>
              <li>
                <strong>Soft Delete Recovery:</strong> Deleting a medicine keeps it in <em>Recently Deleted</em> for 15 days so you can restore accidental deletions.
              </li>
              <li>
                <strong>Permanent Account Erasure:</strong> To purge all cloud documents, push tokens, server schedules, and local device image caches, go to <strong>Settings &rarr; Danger Zone &rarr; Delete Account &amp; All Data</strong>, or visit our statutory web portal at{' '}
                <a href="https://dawasnap.vercel.app/delete-account" target="_blank" rel="noopener noreferrer" className="text-rose-600 font-bold underline">
                  https://dawasnap.vercel.app/delete-account <ExternalLink size={13} className="inline" />
                </a>.
              </li>
            </ul>
          </div>
        </section>

        {/* Support Card */}
        <section className="pt-6 border-t border-[#e5decb] space-y-2">
          <h3 className="text-lg font-bold text-[#1c1917] flex items-center gap-2">
            <Mail size={18} className="text-[#0f9d58]" />
            Official Support Desk &amp; Developer Contact
          </h3>
          <p className="text-sm text-[#44403c] leading-relaxed">
            Need help or have a feature recommendation? Contact Operating Developer <strong>MD NOOR HASSAN</strong> directly at{' '}
            <a 
              href="mailto:mdnoor4860@gmail.com?subject=DawaSnap%20AI%20Support%20Request" 
              className="text-[#0f9d58] font-bold underline"
            >
              mdnoor4860@gmail.com
            </a>.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5decb] bg-[#faf6ee] py-6 px-4 sm:px-8 mt-12 text-xs text-[#78716c]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>&copy; 2026 DawaSnap AI &bull; Ref: DAWASNAP-GUIDE-2026-V2.5</div>
          <div className="flex items-center gap-4">
            <a href="/" className="hover:text-[#0f9d58] font-semibold transition-colors">Home</a>
            <span>•</span>
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
