import React from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Camera, 
  ExternalLink, 
  Bell, 
  Server, 
  AlertTriangle, 
  Database, 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  BookOpen,
  Scale 
} from 'lucide-react';
import { useEdgeSwipeBack } from '../utils/mobileGestures';
import { triggerLightHaptic } from '../utils/haptics';

interface PrivacyPolicyPageProps {
  onBack: () => void;
  isLoggedIn?: boolean;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
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
              <ShieldCheck size={22} className="text-[#0f9d58] shrink-0" />
              <h1 className="text-base sm:text-lg font-bold text-[#1c1917] tracking-tight">
                Privacy Policy &amp; Data Safety
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Legal Document Content - Soft Cream/Beige Background & Enhanced Readable Typography */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* Legal Document Title & Formal Preamble */}
        <section className="space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#e5decb] pb-4 sm:pb-5 gap-2">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1c1917] tracking-tight leading-tight">
                Privacy Policy &amp; Data Safety Declaration
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-[#78716c] uppercase tracking-wider mt-1.5">
                Ref: DAWALENS-PRIVACY-2026-V2.5 &bull; Legal Jurisdiction: India &amp; Global (GDPR)
              </p>
            </div>
            <div className="text-xs sm:text-sm text-[#78716c] font-medium sm:text-right shrink-0">
              <div>Effective Date: October 3, 2026</div>
              <div>Last Revised: October 3, 2026</div>
            </div>
          </div>

          {/* Legal Identity Summary */}
          <div className="text-sm sm:text-base text-[#2c2824] space-y-3 leading-relaxed">
            <p>
              This Privacy Policy and Data Safety Declaration (&ldquo;Policy&rdquo;) is a binding legal agreement between you (&ldquo;User&rdquo;, &ldquo;Data Principal&rdquo;, or &ldquo;you&rdquo;) and <strong>MD NOOR HASSAN</strong>, Operating Developer and Data Controller of <strong>DawaLens AI</strong> (&ldquo;DawaLens AI&rdquo;, &ldquo;Application&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
            </p>
            <p>
              DawaLens AI is available as a native Android application distributed via the Google Play Store (Package: <code className="font-mono text-xs sm:text-sm bg-[#ede5d6] px-1.5 py-0.5 rounded text-[#1c1917] break-all">in.dawalens.app</code>) and as a Progressive Web Application accessible at{' '}
              <a href="https://dawalens.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#0f9d58] font-bold underline break-all">
                https://dawalens.vercel.app
              </a>{' '}
              and{' '}
              <a href="https://dawalensai.onrender.com" target="_blank" rel="noopener noreferrer" className="text-[#0f9d58] font-bold underline break-all">
                https://dawalensai.onrender.com
              </a>.
            </p>
            <p>
              This Policy details our comprehensive compliance framework under the <strong>Google Play Store Health &amp; Medical Apps Policy</strong>, the <strong>Google API Services User Data Policy</strong> (including Limited Use requirements), the <strong>India Digital Personal Data Protection (DPDP) Act, 2023</strong>, and the <strong>General Data Protection Regulation (GDPR - EU/EEA 2016/679)</strong>.
            </p>
          </div>
        </section>

        {/* Quick Table of Contents / Index for Mobile & Desktop Navigation */}
        <section className="bg-[#f4eee1] border border-[#e2d9c8] rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-[#1c1917] text-xs sm:text-sm uppercase tracking-wider">
            <BookOpen size={17} className="text-[#0f9d58]" />
            Table of Articles &amp; Regulatory Clauses
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm font-semibold text-[#2c2824]">
            <a href="#article-1" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f9d58] text-[10px] font-black flex items-center justify-center shrink-0">1</span>
              <span className="truncate">Article 1: Medical Disclaimer</span>
            </a>
            <a href="#article-2" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0">2</span>
              <span className="truncate">Article 2: Google API Limited Use</span>
            </a>
            <a href="#article-3" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f9d58] text-[10px] font-black flex items-center justify-center shrink-0">3</span>
              <span className="truncate">Article 3: Hardware Permissions</span>
            </a>
            <a href="#article-4" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black flex items-center justify-center shrink-0">4</span>
              <span className="truncate">Article 4: AI &amp; Zero Model Training</span>
            </a>
            <a href="#article-5" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-black flex items-center justify-center shrink-0">5</span>
              <span className="truncate">Article 5: Categories of Data</span>
            </a>
            <a href="#article-6" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-rose-600 hover:border-rose-400 transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center shrink-0">6</span>
              <span className="truncate">Article 6: Account Deletion</span>
            </a>
            <a href="#article-7" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-black flex items-center justify-center shrink-0">7</span>
              <span className="truncate">Article 7: Subprocessors</span>
            </a>
            <a href="#article-8" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f9d58] text-[10px] font-black flex items-center justify-center shrink-0">8</span>
              <span className="truncate">Article 8: DPDP Act Officer</span>
            </a>
            <a href="#article-9" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-black flex items-center justify-center shrink-0">9</span>
              <span className="truncate">Article 9: Data Security &amp; GDPR</span>
            </a>
            <a href="#article-10" className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e2d9c8] hover:text-[#0f9d58] hover:border-[#0f9d58] transition-all flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-black flex items-center justify-center shrink-0">10</span>
              <span className="truncate">Article 10: Official Contact</span>
            </a>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* ARTICLE 1 */}
        <section id="article-1" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs sm:text-sm font-black shrink-0">1.0</span>
            <h3 className="tracking-tight">ARTICLE 1: REGULATORY STATUS &amp; MEDICAL DISCLAIMER</h3>
          </div>

          <div className="border-l-4 border-amber-600 bg-[#fef8eb] border border-amber-200/90 p-4 sm:p-5 rounded-r-xl space-y-3 text-sm sm:text-base text-amber-950 leading-relaxed shadow-2xs">
            <div className="font-extrabold uppercase tracking-wider text-amber-900 text-xs sm:text-sm flex items-center gap-2">
              <AlertTriangle size={17} className="text-amber-600 shrink-0" />
              Mandatory Google Play Store Health Apps Disclaimer
            </div>
            <p className="font-bold text-[#1c1917]">
              DAWALENS AI IS AN INFORMATIONAL, ORGANIZATIONAL, AND EDUCATIONAL APPLICATION. IT IS NOT A CERTIFIED MEDICAL DEVICE, DIAGNOSTIC INSTRUMENT, MEDICAL SOFTWARE, OR CLINICAL PRESCRIPTION SYSTEM.
            </p>
            <ul className="list-disc pl-4 sm:pl-5 space-y-2 text-amber-950 font-medium">
              <li>
                <strong>1.1 No Doctor-Patient Relationship:</strong> The features provided—including expiration monitoring, optical character recognition (OCR) of medicine packaging, intake schedules, and AI Pharmacist (&ldquo;Dr. DawaLens&rdquo;) summaries—are intended solely for personal record-keeping and reference. They do not constitute medical advice, clinical diagnosis, personalized drug therapy, or emergency triage.
              </li>
              <li>
                <strong>1.2 Clinical Consultation Required:</strong> Never disregard professional medical advice, alter drug dosages, discontinue prescribed medications, or delay seeking medical evaluation due to information generated by DawaLens AI. Always consult your licensed physician, registered medical practitioner, or licensed pharmacist.
              </li>
              <li>
                <strong>1.3 Medical Emergencies:</strong> If you suspect a drug overdose, life-threatening adverse reaction, anaphylaxis, or acute medical emergency, immediately contact your local emergency response service (such as 112 in India, 911 in North America, or 999 in the UK) or proceed to the nearest emergency room.
              </li>
            </ul>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* ARTICLE 2 */}
        <section id="article-2" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 text-xs sm:text-sm font-black shrink-0">2.0</span>
            <h3 className="tracking-tight">ARTICLE 2: GOOGLE API USER DATA &amp; LIMITED USE DISCLOSURE</h3>
          </div>

          <div className="border-l-4 border-blue-600 bg-[#f2f7fc] border border-blue-200/90 p-4 sm:p-5 rounded-r-xl space-y-2.5 text-sm sm:text-base text-blue-950 leading-relaxed shadow-2xs">
            <div className="font-extrabold uppercase tracking-wider text-blue-900 text-xs sm:text-sm flex items-center gap-2">
              <CheckCircle2 size={17} className="text-blue-600 shrink-0" />
              Affirmation of Google API Limited Use Requirements
            </div>
            <p className="font-semibold text-[#1c1917]">
              DawaLens AI&apos;s use and transfer to any other app of information received from Google APIs adheres strictly to the{' '}
              <a 
                href="https://developers.google.com/terms/api-services-user-data-policy" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-700 underline font-bold inline-flex items-center gap-1 break-all"
              >
                Google API Services User Data Policy <ExternalLink size={13} className="inline shrink-0" />
              </a>
              , including the Limited Use requirements.
            </p>
          </div>

          <div className="text-sm sm:text-base text-[#2c2824] space-y-3 leading-relaxed">
            <p>
              When you authenticate using Google Sign-In, our access and handling of Google user data is strictly circumscribed:
            </p>
            <ul className="list-disc pl-4 sm:pl-5 space-y-2">
              <li>
                <strong>2.1 Minimalist Authentication Scopes Only:</strong> We request only basic identity verification scopes: <code className="font-mono text-xs sm:text-sm bg-[#ede5d6] px-1.5 py-0.5 rounded text-[#1c1917]">openid</code>, <code className="font-mono text-xs sm:text-sm bg-[#ede5d6] px-1.5 py-0.5 rounded text-[#1c1917]">email</code>, and <code className="font-mono text-xs sm:text-sm bg-[#ede5d6] px-1.5 py-0.5 rounded text-[#1c1917]">profile</code> (display name and profile image). We do <strong>NOT</strong> request access to Google Drive, Gmail, Google Contacts, Google Calendar, or device files.
              </li>
              <li>
                <strong>2.2 Exclusively User-Facing Functional Utility:</strong> Google user data is utilized exclusively to establish and authenticate your identity, safeguard your medication vault, and dispatch automated medication expiration reminder emails to your verified address.
              </li>
              <li>
                <strong>2.3 Absolute Zero-Sale Guarantee:</strong> We do not sell, rent, commercialize, lease, or transfer Google user data to advertising platforms, third-party data brokers, or marketing consortiums.
              </li>
              <li>
                <strong>2.4 Prohibition on AI Foundation Training:</strong> User data received through Google OAuth is <strong>NEVER</strong> used to train, retrain, improve, or fine-tune commercial artificial intelligence, machine learning, or foundation large language models.
              </li>
              <li>
                <strong>2.5 Strict Human Access Restrictions:</strong> No human personnel or internal engineers are permitted to view personal Google user data unless you have given explicit affirmative consent for a specific technical resolution, it is mandatory to resolve verified security anomalies, or it is legally required by applicable statute.
              </li>
            </ul>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* ARTICLE 3 */}
        <section id="article-3" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-[#0f9d58] text-xs sm:text-sm font-black shrink-0">3.0</span>
            <h3 className="tracking-tight">ARTICLE 3: DEVICE HARDWARE PERMISSIONS &amp; DATA MINIMIZATION</h3>
          </div>

          <p className="text-sm sm:text-base text-[#2c2824] leading-relaxed">
            In compliance with Google Play Store Device and Network Abuse policies, DawaLens AI requests hardware permissions only when directly required for functional operation:
          </p>

          <div className="space-y-4 text-sm sm:text-base text-[#2c2824]">
            <div className="border-l-4 border-[#0f9d58] bg-[#f5f8f5]/80 border border-[#d2e7d7]/80 p-4 rounded-r-xl space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-[#1c1917] text-sm sm:text-base flex-wrap">
                <Camera size={18} className="text-[#0f9d58] shrink-0" />
                <code className="font-mono text-xs sm:text-sm bg-[#ede5d6] px-1.5 py-0.5 rounded text-[#1c1917] break-all">android.permission.CAMERA</code>
                <span className="text-[#57534e] font-normal">&mdash; Optical Character Recognition (OCR) Only</span>
              </div>
              <p className="text-[#44403c] leading-relaxed">
                <strong>Justification &amp; Purpose:</strong> The camera permission is invoked solely when you initiate scanning of a medicine carton, blister pack, syrup bottle, or pharmaceutical label.
                <br />
                <strong>Hybrid Image Architecture &amp; Physical Local Storage:</strong>
                <ul className="list-disc pl-4 sm:pl-5 space-y-1.5 mt-1.5">
                  <li><strong>Local Vault Storage:</strong> Medicine photos associated with your saved inventory are stored 100% locally on your physical device in sandboxed IndexedDB storage (<code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">DawaLensLocalImages</code>). They are NEVER stored in Firebase Cloud Storage, AWS S3, or remote database disks.</li>
                  <li><strong>Online AI Extraction:</strong> During real-time scanning in online mode, the captured packaging image is transmitted over encrypted TLS 1.3 HTTPS to our backend proxy and Google Gemini 2.5 Flash for multimodal packaging character recognition and validation. No PII (no name, email, or user identifier) is ever transmitted with the photo. The image is processed ephemerally in RAM and is never persisted or saved to server disks.</li>
                  <li><strong>100% Offline On-Device Fallback:</strong> If offline or when cloud API access is unavailable, image OCR and visual form classification run entirely on-device via client-side Tesseract.js, native Android TextBridge, and our local CNN/SLM model with zero remote transmission.</li>
                </ul>
              </p>
            </div>

            <div className="border-l-4 border-blue-600 bg-[#f4f7fa]/80 border border-[#d3dfed]/80 p-4 rounded-r-xl space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-[#1c1917] text-sm sm:text-base flex-wrap">
                <Bell size={18} className="text-blue-600 shrink-0" />
                <code className="font-mono text-xs sm:text-sm bg-[#ede5d6] px-1.5 py-0.5 rounded text-[#1c1917] break-all">android.permission.POST_NOTIFICATIONS</code>
                <span className="text-[#57534e] font-normal">&amp;</span>
                <code className="font-mono text-xs sm:text-sm bg-[#ede5d6] px-1.5 py-0.5 rounded text-[#1c1917] break-all">USE_EXACT_ALARM / SCHEDULE_EXACT_ALARM</code>
              </div>
              <p className="text-[#44403c] leading-relaxed">
                <strong>Medical Necessity &amp; Patient Safety Justification:</strong> In strict compliance with the Google Play Store Exact Alarm Policy (Android 13+ / 14+), DawaLens AI requests <code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">USE_EXACT_ALARM</code> and <code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">SCHEDULE_EXACT_ALARM</code> solely because minute-precise timing is mandatory for patient therapeutic adherence and life-safety. Delayed or batched reminders can lead to missed doses of narrow-therapeutic-index drugs (such as insulin, cardiovascular medications, or antibiotics) or accidental consumption of expired pharmaceuticals.
              </p>
              <p className="text-[#44403c] leading-relaxed">
                <strong>Local Alarms &amp; Cloud Push Sync:</strong> Daily dose alarms are scheduled locally in the Android operating system&apos;s native <code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">AlarmManager</code> for 100% offline precision. For automated pharmaceutical expiration alerts (at 30 days, 7 days, and expiration), push notifications can also be dispatched via Firebase Cloud Messaging (FCM) and email via Resend when configured in your notification preferences.
                <br />
                <strong>Strict Zero-Marketing Guarantee:</strong> DawaLens AI never broadcasts promotional messages, engagement nudges, advertising, or sponsored push notifications. Notifications exist exclusively for scheduled dose reminders and pharmaceutical expiration warnings.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* ARTICLE 4 */}
        <section id="article-4" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 text-xs sm:text-sm font-black shrink-0">4.0</span>
            <h3 className="tracking-tight">ARTICLE 4: ARTIFICIAL INTELLIGENCE INFRASTRUCTURE &amp; CLINICAL QUERIES</h3>
          </div>

          <p className="text-sm sm:text-base text-[#2c2824] leading-relaxed">
            DawaLens AI incorporates a hybrid dual-layer artificial intelligence architecture combining cloud reasoning and proprietary on-device machine intelligence:
          </p>

          <div className="space-y-4 text-sm sm:text-base text-[#2c2824]">
            <div className="space-y-2.5">
              <h4 className="font-bold text-[#1c1917] flex items-center gap-2 text-base sm:text-lg">
                <Server size={18} className="text-purple-600 shrink-0" />
                4.1 Cloud Reasoning: Google AI Studio Gemini API (Free Tier Terms Disclosure)
              </h4>
              <p className="text-[#44403c] leading-relaxed">
                For complex clinical pharmacology reasoning, interaction screening between multiple medications, and detailed usage schedules, the Application sends queries over secure TLS 1.3 encrypted channels to the Google AI Studio Gemini API.
              </p>
              <div className="bg-[#f5efe4] border border-[#e2d9c8] rounded-xl p-4 text-sm sm:text-base text-[#2c2824] space-y-2 leading-relaxed shadow-2xs">
                <p className="font-bold text-[#1c1917]">Google AI Studio Free Tier Data Handling Disclosure:</p>
                <p>
                  In accordance with Google AI Studio developer terms for the Free Tier, prompt data may be processed and reviewed by Google to maintain, improve, and develop Google products and services under Google&apos;s API Terms of Service.
                </p>
                <p className="font-bold text-[#0f9d58]">
                  Privacy Safeguards: DawaLens AI strips all Personally Identifiable Information (PII) before transmission. Your name, email address, IP address, and Firebase User ID (UID) are NEVER included in AI prompt payloads. Only abstract drug names and pharmacological questions are transmitted.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-bold text-[#1c1917] flex items-center gap-2 text-base sm:text-lg">
                <Database size={18} className="text-[#0f9d58] shrink-0" />
                4.2 On-Device Small Language Model (SLM): Strict Zero User Data Training Guarantee
              </h4>
              <p className="text-[#44403c] leading-relaxed">
                To guarantee zero-latency response times and full offline capability without internet access, DawaLens AI deploys a proprietary on-device Small Language Model (~2.1M parameter clinical formulary).
              </p>
              <div className="bg-[#f5efe4] border border-[#e2d9c8] rounded-xl p-4 text-sm sm:text-base text-[#2c2824] space-y-2.5 leading-relaxed shadow-2xs">
                <p className="font-bold text-[#1c1917]">Strict Zero Model Training on User Data Policy:</p>
                <ul className="list-disc pl-4 sm:pl-5 space-y-2 text-[#44403c]">
                  <li>
                    <strong>Zero User Data Training:</strong> DawaLens AI does <strong>NOT</strong> collect, harvest, store, or utilize your conversation messages, clinical consultations, scanned prescriptions, or medication records to train, retrain, distill, or fine-tune our Small Language Model (SLM) or any artificial intelligence models.
                  </li>
                  <li>
                    <strong>Pre-Trained Static Clinical Formulary:</strong> Our SLM model is completely pre-trained on static, peer-reviewed, publicly available pharmacological compendia, clinical pharmacology guidelines, and drug interaction databases. It operates strictly in an inference-only, read-only capacity.
                  </li>
                  <li>
                    <strong>Ephemeral In-Memory Inference:</strong> All on-device queries processed by the SLM are executed transiently in device RAM and are immediately discarded upon response completion. No prompts, inputs, or generated answers are archived for model training or improvement.
                  </li>
                  <li>
                    <strong>Absolute Zero-Sale &amp; Zero-Brokerage Guarantee:</strong> We do NOT sell, license, trade, publish, or distribute user queries, health data, or algorithmic weights to any third parties, advertisers, pharmaceutical corporations, or commercial data brokers.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* ARTICLE 5 */}
        <section id="article-5" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-stone-200 text-stone-800 text-xs sm:text-sm font-black shrink-0">5.0</span>
            <h3 className="tracking-tight">ARTICLE 5: CATEGORIES OF DATA PROCESSED &amp; LAWFUL BASES</h3>
          </div>

          {/* Responsive Data Processing Matrix Table - Clean In-Line on Phone & Desktop */}
          <div className="border border-[#ded6c5] rounded-xl overflow-hidden bg-[#fdfbf7] shadow-xs">
            <div className="bg-[#ede5d6] px-4 py-2.5 border-b border-[#ded6c5] flex items-center justify-between text-xs sm:text-sm text-[#2c2824]">
              <span className="font-bold text-[#1c1917]">Data Processing Matrix</span>
              <span className="text-xs sm:hidden text-[#0f9d58] font-bold bg-[#e8f5ec] border border-[#cbe8d4] px-2 py-0.5 rounded">
                Scroll &rarr;
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm md:text-base text-left min-w-[580px] border-collapse">
                <thead className="bg-[#f1eae0] text-[#1c1917] font-bold text-xs sm:text-sm uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 border-b border-[#ded6c5]">Category</th>
                    <th className="p-3.5 border-b border-[#ded6c5]">Specific Elements</th>
                    <th className="p-3.5 border-b border-[#ded6c5]">Processing Purpose</th>
                    <th className="p-3.5 border-b border-[#ded6c5]">Lawful Basis (GDPR / DPDP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e1d3] text-[#2c2824]">
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#1c1917] whitespace-nowrap align-top bg-[#f7f2e8]/70">Account Identity</td>
                    <td className="p-3.5 align-top">Name, email address, profile avatar, Firebase UID.</td>
                    <td className="p-3.5 align-top">Authentication, account recovery, session security.</td>
                    <td className="p-3.5 font-medium align-top">Contract Performance (GDPR Art. 6(1)(b))</td>
                  </tr>
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#1c1917] whitespace-nowrap align-top bg-[#f7f2e8]/70">Medication Vault &amp; History</td>
                    <td className="p-3.5 align-top">Medicine names, dosages, forms, expiry dates, quantities, schedules, tags, dose-taken logs, and history audit records (<code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">medicines</code> &amp; subcollection <code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">history</code>).</td>
                    <td className="p-3.5 align-top">Inventory tracking, expiration monitoring, dose adherence logs, therapeutic history tracking.</td>
                    <td className="p-3.5 font-medium align-top">Explicit Consent &amp; Contract Performance</td>
                  </tr>
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#1c1917] whitespace-nowrap align-top bg-[#f7f2e8]/70">User Configurations</td>
                    <td className="p-3.5 align-top">Notification preferences, low-stock threshold, UI theme, accent color, and sort order (<code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">userConfigs</code>).</td>
                    <td className="p-3.5 align-top">Personalization of alert thresholds and user interface settings across devices.</td>
                    <td className="p-3.5 font-medium align-top">Legitimate Interest (App Customization)</td>
                  </tr>
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#1c1917] whitespace-nowrap align-top bg-[#f7f2e8]/70">Notification Delivery &amp; Mailbox</td>
                    <td className="p-3.5 align-top">FCM device tokens (<code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">user_push_tokens</code>) and dispatched email alert copies (<code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">mail</code> &amp; <code className="font-mono text-xs bg-[#ede5d6] px-1 py-0.5 rounded text-[#1c1917]">server_sent_expiry_alerts</code>).</td>
                    <td className="p-3.5 align-top">Delivery of critical expiration and refill warnings; in-app mailbox history log.</td>
                    <td className="p-3.5 font-medium align-top">Explicit Consent &amp; Vital Interests (Patient Safety)</td>
                  </tr>
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#1c1917] whitespace-nowrap align-top bg-[#f7f2e8]/70">Consultation Queries (Health Data)</td>
                    <td className="p-3.5 align-top">Pharmacological inquiries, drug-drug interaction checks, and medication schedules submitted for real-time consultation (Special Category Data under GDPR Art. 9).</td>
                    <td className="p-3.5 align-top">Immediate clinical pharmacological guidance and interaction checks. Strictly zero user data is stored, retained, or processed for model training or fine-tuning.</td>
                    <td className="p-3.5 font-medium align-top">
                      <span className="font-bold text-[#0f9d58]">Explicit Consent</span> (GDPR Art. 9(2)(a) &bull; DPDP Act Sec. 6) &amp; Legitimate Interest (Safety &amp; Patient Protection)
                    </td>
                  </tr>
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#1c1917] whitespace-nowrap align-top bg-[#f7f2e8]/70">Technical Diagnostics</td>
                    <td className="p-3.5 align-top">Anonymized OS version, crash logs, performance telemetry.</td>
                    <td className="p-3.5 align-top">Bug identification, app crash mitigation, stability.</td>
                    <td className="p-3.5 font-medium align-top">Legitimate Interest (App Security)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* ARTICLE 6 */}
        <section id="article-6" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-900 text-xs sm:text-sm font-black shrink-0">6.0</span>
            <h3 className="tracking-tight text-rose-950">ARTICLE 6: MANDATORY ACCOUNT &amp; DATA DELETION PROCEDURES</h3>
          </div>

          <p className="text-sm sm:text-base text-[#2c2824] leading-relaxed">
            In compliance with the <strong>Google Play Store Data Safety and Account Deletion Policy</strong>, users maintain comprehensive, unconditional rights to delete their account and associated health records at any time. We provide both in-app and standalone web-based deletion pathways:
          </p>

          <div className="space-y-4 text-sm sm:text-base text-[#2c2824]">
            <div className="border-l-4 border-rose-500 bg-[#fdf4f4]/80 border border-rose-200/60 p-4 rounded-r-xl space-y-2 shadow-2xs">
              <h4 className="font-bold text-[#1c1917] text-base sm:text-lg">6.1 In-App Immediate Deletion:</h4>
              <ol className="list-decimal pl-4 sm:pl-5 space-y-1.5 text-[#44403c] leading-relaxed">
                <li>Launch the DawaLens AI app.</li>
                <li>Tap the <strong>Settings</strong> gear icon (or user profile avatar) in the top navigation bar.</li>
                <li>Scroll down to the <strong>Danger Zone</strong> section.</li>
                <li>Tap <strong>&ldquo;Delete Account &amp; All Data&rdquo;</strong>.</li>
                <li>Confirm the security prompt. All Cloud Firestore database documents, medication entries, intake history logs, and Firebase Authentication credentials are permanently and irreversibly purged immediately.</li>
              </ol>
            </div>

            <div className="border-l-4 border-rose-500 bg-[#fdf4f4]/80 border border-rose-200/60 p-4 rounded-r-xl space-y-1.5 shadow-2xs">
              <h4 className="font-bold text-[#1c1917] text-base sm:text-lg">6.2 Dedicated Web Deletion Portal (Without App Installed):</h4>
              <p className="text-[#44403c] leading-relaxed">
                If you have uninstalled the application or cannot access your Android device, you can delete your account and all associated data via our permanent web deletion portal:
                <br />
                <a 
                  href="https://dawalens.vercel.app/delete-account" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-rose-600 font-bold underline inline-flex items-center gap-1 mt-1.5 break-all"
                >
                  https://dawalens.vercel.app/delete-account <ExternalLink size={14} className="shrink-0" />
                </a>
              </p>
            </div>

            <div className="border-l-4 border-[#a8a29e] bg-[#f5f0e6]/80 border border-[#ded6c5] p-4 rounded-r-xl space-y-1.5 shadow-2xs">
              <h4 className="font-bold text-[#1c1917] text-base sm:text-lg">6.3 Email Deletion Request:</h4>
              <p className="text-[#44403c] leading-relaxed">
                You may also send an email request directly to our developer at{' '}
                <a href="mailto:mdnoor4860@gmail.com?subject=Account%20and%20Data%20Deletion%20Request" className="text-rose-600 font-bold underline break-all">
                  mdnoor4860@gmail.com
                </a>{' '}
                with the subject line <em>&ldquo;Account Deletion Request&rdquo;</em> from your registered account email. All associated records will be purged within 48 to 72 hours of verification.
              </p>
            </div>

            <div className="border-l-4 border-blue-500 bg-[#f0f6fc]/80 border border-blue-200/60 p-4 rounded-r-xl space-y-1.5 shadow-2xs">
              <h4 className="font-bold text-[#1c1917] text-base sm:text-lg">6.4 Revocation of Google Permissions:</h4>
              <p className="text-[#44403c] leading-relaxed">
                You may disconnect DawaLens AI&apos;s access to your Google account at any time via your{' '}
                <a 
                  href="https://myaccount.google.com/permissions" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-700 font-bold underline inline-flex items-center gap-1 break-all"
                >
                  Google Account Permissions Page <ExternalLink size={14} className="shrink-0" />
                </a>.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* ARTICLE 7 */}
        <section id="article-7" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-stone-200 text-stone-800 text-xs sm:text-sm font-black shrink-0">7.0</span>
            <h3 className="tracking-tight">ARTICLE 7: THIRD-PARTY TECHNICAL SUBPROCESSORS</h3>
          </div>

          <p className="text-sm sm:text-base text-[#2c2824] leading-relaxed">
            DawaLens AI does not sell data. We share information only with technical infrastructure subprocessors bound by strict data processing agreements, SOC 2 / ISO 27001 certifications, and confidentiality obligations:
          </p>

          {/* Responsive Technical Subprocessors Table - Clean In-Line on Phone & Desktop */}
          <div className="border border-[#ded6c5] rounded-xl overflow-hidden bg-[#fdfbf7] shadow-xs">
            <div className="bg-[#ede5d6] px-4 py-2.5 border-b border-[#ded6c5] flex items-center justify-between text-xs sm:text-sm text-[#2c2824]">
              <span className="font-bold text-[#1c1917]">Technical Subprocessors Matrix</span>
              <span className="text-xs sm:hidden text-[#0f9d58] font-bold bg-[#e8f5ec] border border-[#cbe8d4] px-2 py-0.5 rounded">
                Scroll &rarr;
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm md:text-base text-left min-w-[540px] border-collapse">
                <thead className="bg-[#f1eae0] text-[#1c1917] font-bold text-xs sm:text-sm uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 border-b border-[#ded6c5]">Subprocessor</th>
                    <th className="p-3.5 border-b border-[#ded6c5]">Role &amp; Processing Activity</th>
                    <th className="p-3.5 border-b border-[#ded6c5]">Data Location &amp; Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e1d3] text-[#2c2824]">
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#1c1917] whitespace-nowrap align-top bg-[#f7f2e8]/70">Google LLC (Firebase &amp; Cloud)</td>
                    <td className="p-3.5 align-top">User authentication, encrypted Cloud Firestore database, crash logging.</td>
                    <td className="p-3.5 font-medium align-top">SOC 2/3, ISO 27001, HIPAA &amp; GDPR Compliant.</td>
                  </tr>
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#1c1917] whitespace-nowrap align-top bg-[#f7f2e8]/70">Google LLC (Google AI Studio)</td>
                    <td className="p-3.5 align-top">Clinical query inference for medication guidance (Free Tier terms apply).</td>
                    <td className="p-3.5 font-medium align-top">De-identified transmission, zero PII sent.</td>
                  </tr>
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#1c1917] whitespace-nowrap align-top bg-[#f7f2e8]/70">Resend Inc.</td>
                    <td className="p-3.5 align-top">Transactional delivery of automated expiration reminder emails.</td>
                    <td className="p-3.5 font-medium align-top">SOC 2 Type II Certified, GDPR Compliant.</td>
                  </tr>
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#1c1917] whitespace-nowrap align-top bg-[#f7f2e8]/70">Vercel Inc. &amp; Render Services</td>
                    <td className="p-3.5 align-top">PWA hosting, SSL termination, and secure API reverse-proxy routing.</td>
                    <td className="p-3.5 font-medium align-top">ISO 27001, TLS 1.3 encryption.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* ARTICLE 8 */}
        <section id="article-8" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-[#0f9d58] text-xs sm:text-sm font-black shrink-0">8.0</span>
            <h3 className="tracking-tight">ARTICLE 8: INDIA DPDP ACT COMPLIANCE &amp; GRIEVANCE OFFICER</h3>
          </div>

          <div className="text-sm sm:text-base text-[#2c2824] space-y-3 leading-relaxed">
            <p>
              In compliance with the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> of India, Indian citizens (&ldquo;Data Principals&rdquo;) enjoy statutory rights to data access, correction, erasure, and grievance redressal:
            </p>
            <div className="bg-[#f5efe4] border border-[#e2d9c8] p-4 rounded-xl text-sm sm:text-base text-[#2c2824] shadow-2xs space-y-1.5">
              <div className="font-bold text-[#1c1917] flex items-center gap-2 text-sm sm:text-base">
                <Scale size={18} className="text-[#0f9d58] shrink-0" />
                <span>8.4 Statutory Right to Nominate (DPDP Act, 2023 Sec. 14):</span>
              </div>
              <p className="text-[#44403c] leading-relaxed">
                In accordance with Section 14 of the DPDP Act, 2023, you have the statutory right to nominate any individual who shall, in the event of your death or medical/legal incapacity, exercise your data protection rights (including data access, portability, objection, and permanent account erasure) on your behalf by contacting our designated Grievance Officer.
              </p>
            </div>
          </div>

          {/* Statutory Grievance Redressal Officer Table - Responsive In-Line View */}
          <div className="border border-[#ded6c5] rounded-xl overflow-hidden bg-[#fdfbf7] shadow-xs">
            <div className="bg-[#ede5d6] px-4 py-2.5 border-b border-[#ded6c5] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 font-bold text-[#1c1917] text-xs sm:text-sm md:text-base">
                <UserCheck size={18} className="text-[#0f9d58] shrink-0" />
                <span>Statutory Grievance Redressal Officer</span>
              </div>
              <span className="text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0f9d58] tracking-wider uppercase shrink-0">
                DPDP Act 2023
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm md:text-base text-left border-collapse">
                <tbody className="divide-y divide-[#e8e1d3] text-[#2c2824]">
                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <th scope="row" className="py-3 px-3.5 sm:px-4 font-semibold text-[#57534e] w-[32%] sm:w-48 shrink-0 align-middle bg-[#f6f0e4]">
                      Officer Name
                    </th>
                    <td className="py-3 px-3.5 sm:px-4 font-bold text-[#1c1917] align-middle">
                      MD NOOR HASSAN
                    </td>
                  </tr>

                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <th scope="row" className="py-3 px-3.5 sm:px-4 font-semibold text-[#57534e] w-[32%] sm:w-48 shrink-0 align-middle bg-[#f6f0e4]">
                      Designation
                    </th>
                    <td className="py-3 px-3.5 sm:px-4 text-[#2c2824] font-medium align-middle">
                      Data Protection &amp; Grievance Redressal Officer
                    </td>
                  </tr>

                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <th scope="row" className="py-3 px-3.5 sm:px-4 font-semibold text-[#57534e] w-[32%] sm:w-48 shrink-0 align-middle bg-[#f6f0e4]">
                      Official Email
                    </th>
                    <td className="py-3 px-3.5 sm:px-4 align-middle">
                      <a href="mailto:mdnoor4860@gmail.com" className="text-[#0f9d58] font-bold underline break-all inline-flex items-center gap-1">
                        mdnoor4860@gmail.com
                      </a>
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
                      <span className="inline-block">Resolution within <strong>30 days</strong></span>
                    </td>
                  </tr>

                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <th scope="row" className="py-3 px-3.5 sm:px-4 font-semibold text-[#57534e] w-[32%] sm:w-48 shrink-0 align-middle bg-[#f6f0e4]">
                      Jurisdiction
                    </th>
                    <td className="py-3 px-3.5 sm:px-4 text-[#2c2824] align-middle">
                      Republic of India (DPDP Act, 2023 Rules)
                    </td>
                  </tr>

                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <th scope="row" className="py-3 px-3.5 sm:px-4 font-semibold text-[#57534e] w-[32%] sm:w-48 shrink-0 align-middle bg-[#f6f0e4]">
                      Right to Nominate
                    </th>
                    <td className="py-3 px-3.5 sm:px-4 text-[#2c2824] align-middle">
                      Sec. 14 DPDP Act: Authorize a legal representative to exercise rights upon death or incapacity.
                    </td>
                  </tr>

                  <tr className="hover:bg-[#f3ede1]/60 transition-colors">
                    <th scope="row" className="py-3 px-3.5 sm:px-4 font-semibold text-[#57534e] w-[32%] sm:w-48 shrink-0 align-middle bg-[#f6f0e4]">
                      Deletion Portal
                    </th>
                    <td className="py-3 px-3.5 sm:px-4 align-middle">
                      <a 
                        href="https://dawalens.vercel.app/delete-account" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-rose-600 font-semibold underline inline-flex items-center gap-1 break-all"
                      >
                        https://dawalens.vercel.app/delete-account <ExternalLink size={14} className="shrink-0" />
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* ARTICLE 9 */}
        <section id="article-9" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-stone-200 text-stone-800 text-xs sm:text-sm font-black shrink-0">9.0</span>
            <h3 className="tracking-tight">ARTICLE 9: DATA SECURITY, INTERNATIONAL TRANSFERS &amp; GDPR RIGHTS</h3>
          </div>

          <div className="text-sm sm:text-base text-[#2c2824] space-y-3 leading-relaxed">
            <ul className="list-disc pl-4 sm:pl-5 space-y-2">
              <li>
                <strong>9.1 Cryptographic Protection:</strong> All data in transit is encrypted using modern TLS 1.3 encryption. Stored database documents are protected using enterprise AES-256 encryption at rest in Google Cloud Firestore.
              </li>
              <li>
                <strong>9.2 Data Portability:</strong> Users may export their entire medication vault into structured CSV format at any time directly from the dashboard for personal archival or transfer.
              </li>
              <li>
                <strong>9.3 European Union (GDPR) Rights:</strong> EU/EEA and UK users possess statutory rights under Articles 15-22 to access, rectify, restrict processing of, object to processing of, and erase personal data, as well as lodge a complaint with their supervisory Data Protection Authority.
              </li>
              <li>
                <strong>9.4 Children&apos;s Online Privacy Protection (COPPA):</strong> DawaLens AI is not directed at children under the age of 13 (or under 16 in the European Union). We do not knowingly collect personal data from minors.
              </li>
              <li>
                <strong>9.5 Policy Revisions:</strong> Any material revisions to this Privacy Policy will be notified within the application interface and reflected on this permanent URL.
              </li>
            </ul>
          </div>
        </section>

        <div className="border-t border-[#e5decb]" />

        {/* ARTICLE 10 */}
        <section id="article-10" className="space-y-4 pb-10 scroll-mt-20">
          <div className="flex items-center gap-2.5 text-[#1c1917] font-bold text-lg sm:text-xl">
            <span className="px-2.5 py-0.5 rounded-md bg-stone-200 text-stone-800 text-xs sm:text-sm font-black shrink-0">10.0</span>
            <h3 className="tracking-tight">ARTICLE 10: GOVERNING LAW &amp; OFFICIAL CONTACT</h3>
          </div>
          <p className="text-sm sm:text-base text-[#2c2824] leading-relaxed">
            For questions, legal notices, or assistance regarding our privacy practices and data safety compliance:
          </p>
          <div className="text-sm sm:text-base text-[#44403c] space-y-1.5 pt-1 bg-[#f5efe4] border border-[#e2d9c8] p-4 rounded-xl shadow-2xs">
            <p><strong>Entity:</strong> DawaLens AI</p>
            <p><strong>Operating Developer &amp; Data Controller:</strong> MD NOOR HASSAN</p>
            <p><strong>Official Email:</strong> <a href="mailto:mdnoor4860@gmail.com" className="text-[#0f9d58] font-bold underline break-all">mdnoor4860@gmail.com</a></p>
            <p><strong>Official Web Domain:</strong> <a href="https://dawalens.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#0f9d58] font-bold underline break-all">https://dawalens.vercel.app</a></p>
            <p><strong>Account Deletion Portal:</strong> <a href="https://dawalens.vercel.app/delete-account" target="_blank" rel="noopener noreferrer" className="text-rose-600 font-bold underline break-all">https://dawalens.vercel.app/delete-account</a></p>
          </div>
        </section>
      </main>

      {/* Clean Legal Footer in soft warm parchment style */}
      <footer className="border-t border-[#e2d9c8] bg-[#f4eee1] py-5 px-4 sm:px-8 text-xs sm:text-sm text-[#78716c]">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-3 text-center">
          {/* Above: all buttons in one line */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-5 flex-wrap font-medium text-[#57534e]">
            <a 
              href="/" 
              onClick={() => triggerLightHaptic()} 
              className="hover:text-[#0f9d58] transition-colors"
            >
              Home
            </a>
            <span className="text-[#a8a29e]">&bull;</span>
            <a 
              href="/guide" 
              onClick={() => triggerLightHaptic()} 
              className="hover:text-[#0f9d58] transition-colors"
            >
              User Guide
            </a>
            <span className="text-[#a8a29e]">&bull;</span>
            <a 
              href="/terms" 
              onClick={() => triggerLightHaptic()} 
              className="hover:text-[#0f9d58] transition-colors"
            >
              Terms of Service
            </a>
            <span className="text-[#a8a29e]">&bull;</span>
            <a 
              href="/delete-account" 
              onClick={() => triggerLightHaptic()} 
              className="hover:text-rose-600 transition-colors"
            >
              Delete Account
            </a>
          </div>

          {/* Dividing line below the buttons */}
          <div className="w-full border-t border-[#e2d9c8]" />

          {/* Below: 2026 dawalens ai text and domain in one line */}
          <div className="flex items-center justify-center gap-2 flex-wrap text-center">
            <span>&copy; 2026 DawaLens AI</span>
            <span className="text-[#a8a29e]">&bull;</span>
            <span>Registered Domain:</span>
            <a 
              href="https://dawalens.vercel.app" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-[#0f9d58] underline font-medium"
            >
              https://dawalens.vercel.app
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
