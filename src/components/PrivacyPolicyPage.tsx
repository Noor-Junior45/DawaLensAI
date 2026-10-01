import React from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  Camera, 
  Trash2,
  Mail,
  CheckCircle2,
  ExternalLink,
  Bell,
  Cpu,
  Server,
  FileText
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#0f9d58] selection:text-white flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                triggerLightHaptic();
                onBack();
              }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 active:scale-95 cursor-pointer"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-[#0f9d58]" />
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Privacy Policy &amp; Data Safety
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
            <a href="/terms" className="hover:text-[#0f9d58] transition-colors">Terms</a>
            <span>•</span>
            <a href="/delete-account" className="hover:text-rose-600 transition-colors">Delete Account</a>
          </div>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 space-y-10">
        {/* Document Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#0f9d58] border border-emerald-200">
              <CheckCircle2 size={13} /> Google OAuth &amp; Play Store Compliance
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Effective Date: September 29, 2026 &bull; Last Updated: September 29, 2026
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Privacy Policy for DawaLens AI
          </h2>

          <div className="text-sm text-slate-600 space-y-2 leading-relaxed">
            <p>
              <strong>Application:</strong> DawaLens AI &bull; <strong>Domains:</strong>{' '}
              <a href="https://dawalens.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#0f9d58] font-bold underline">
                https://dawalens.vercel.app
              </a>{' '}
              and{' '}
              <a href="https://dawalensai.onrender.com" target="_blank" rel="noopener noreferrer" className="text-[#0f9d58] font-bold underline">
                https://dawalensai.onrender.com
              </a>
            </p>
            <p>
              <strong>Developer &amp; Data Controller:</strong> DawaLens AI &bull;{' '}
              <strong>Contact:</strong>{' '}
              <a href="mailto:mdnoor4860@gmail.com" className="text-[#0f9d58] font-bold underline">
                mdnoor4860@gmail.com
              </a>
            </p>
            <p className="pt-2 text-slate-700">
              DawaLens AI (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;, or &ldquo;the Service&rdquo;) is committed to protecting your personal data, medical privacy, and digital rights. This Privacy Policy details our standards regarding the collection, handling, processing, encryption, storage, and permanent deletion of user data in full adherence to the <strong>Google API Services User Data Policy</strong> (including Limited Use requirements) and the <strong>Google Play Store Data Safety Policy</strong>.
            </p>
          </div>
        </div>

        {/* 1. Google API Services Limited Use Requirements (Critical Callout) */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-lg sm:text-xl border-b border-slate-100 pb-3">
            <Lock size={20} className="text-[#1a73e8]" />
            <h3>1. Google API Services User Data &amp; Limited Use Disclosure</h3>
          </div>

          <div className="p-4 sm:p-5 bg-blue-50/80 border-l-4 border-[#1a73e8] rounded-r-xl text-xs sm:text-sm text-blue-950 space-y-2">
            <div className="font-extrabold uppercase tracking-wider text-blue-900 text-xs flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-[#1a73e8]" />
              Mandatory Limited Use Compliance Statement
            </div>
            <p className="font-bold leading-relaxed">
              DawaLens AI&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
              <a 
                href="https://developers.google.com/terms/api-services-user-data-policy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#1a73e8] underline font-black inline-flex items-center gap-0.5"
              >
                Google API Services User Data Policy <ExternalLink size={12} className="inline" />
              </a>
              , including the Limited Use requirements.
            </p>
          </div>

          <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
            <p>
              When you choose to sign in to DawaLens AI with Google, we access and handle your data according to strict limitations:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong className="text-slate-800">OAuth Scopes Requested:</strong> We only request basic identification scopes: <code>openid</code>, <code>email</code>, and <code>profile</code> (your display name and profile image). We do <strong>NOT</strong> request access to Google Drive, Gmail, Contacts, or any external files.
              </li>
              <li>
                <strong className="text-slate-800">Strictly User-Facing Features:</strong> We use your Google user data solely to authenticate your identity, secure your medication inventory vault, and send you automated medicine expiration reminder emails.
              </li>
              <li>
                <strong className="text-slate-800">No Data Selling or Advertising:</strong> We never sell, rent, commercialize, or transfer your Google user data to advertisers, data brokers, or marketing networks.
              </li>
              <li>
                <strong className="text-slate-800">No AI Model Training:</strong> Google user data, profile information, and medication records are <strong>NEVER</strong> used to train, retrain, fine-tune, or ground generic AI, machine learning, or Large Language Models (LLMs).
              </li>
              <li>
                <strong className="text-slate-800">Human Access Prohibited:</strong> No employee or human has access to read your personal Google data unless we receive your affirmative consent for technical troubleshooting, it is required for security/abuse investigations, or as mandated by law.
              </li>
            </ul>
          </div>
        </section>

        {/* 2. Information We Collect */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-3">
            <FileText size={20} className="text-[#0f9d58]" />
            <h3>2. Information We Collect &amp; Permissions</h3>
          </div>

          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <div>
              <h4 className="font-bold text-slate-800 mb-1">A. User-Provided Information:</h4>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Profile Identifiers:</strong> Name, email address, profile avatar, and Firebase authentication UID.</li>
                <li><strong>Medication Vault:</strong> Brand names, generic pharmaceutical active ingredients, dosages (e.g. 500mg), forms (tablets, capsules, syrups, drops, injections), batch numbers, remaining counts, expiry dates, intake schedules, and directions for use.</li>
                <li><strong>Consultation Inquiries:</strong> Any questions or symptoms typed or spoken into the AI Pharmacist consultation tool.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-1">B. Device Hardware Permissions &amp; Strict Safeguards:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs uppercase tracking-wider">
                    <Camera size={16} className="text-[#0f9d58]" />
                    Camera Permission (CAMERA)
                  </div>
                  <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                    Used exclusively for optical character recognition (OCR) and packaging scanning via on-device Tesseract and CNN algorithms. <strong>100% On-Device:</strong> Images are cached only in your device&apos;s sandboxed IndexedDB memory and are <strong>NEVER</strong> sent to cloud servers.
                  </p>
                </div>

                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-blue-900 text-xs uppercase tracking-wider">
                    <Bell size={16} className="text-[#1a73e8]" />
                    Notifications (POST_NOTIFICATIONS)
                  </div>
                  <p className="text-xs text-blue-950 font-medium leading-relaxed">
                    Used solely for scheduled medication intake alarms and automated expiration warnings (at 30 days, 7 days, and expiration day). No promotional or advertising push notifications are ever sent.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-1">C. Technical Diagnostics:</h4>
              <p className="text-xs text-slate-500">
                Aggregated, anonymized telemetry (operating system version, browser type, and non-sensitive crash diagnostics) via Google Analytics 4. IP addresses are anonymized. Health records, medicine names, and photos are strictly excluded from analytics.
              </p>
            </div>
          </div>
        </section>

        {/* 3. AI Pharmacist & Gemini API */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-3">
            <Cpu size={20} className="text-violet-600" />
            <h3>3. AI Pharmacist &amp; Large Language Model (LLM) Processing</h3>
          </div>
          <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
            <p>
              DawaLens AI includes an AI Pharmacist companion (&ldquo;Dr. DawaLens&rdquo;) combining Google Gemini API and an on-device Small Language Model (SLM):
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>No Personal Identifiers Passed:</strong> When generating clinical answers or checking drug interactions, only the clinical query and relevant medicine names are evaluated. Your personal name, email address, and Google OAuth credentials are never sent to AI endpoints.
              </li>
              <li>
                <strong>No Model Training:</strong> Your medical queries and medication vault data are never used to train, fine-tune, or improve Google&apos;s public foundation models.
              </li>
              <li>
                <strong>Offline SLM Resilience:</strong> If your device loses network connectivity, our on-device Small Language Model answers routine inquiries entirely in your local browser runtime.
              </li>
            </ul>
          </div>
        </section>

        {/* 4. Subprocessors & Data Sharing */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-3">
            <Server size={20} className="text-[#0f9d58]" />
            <h3>4. Third-Party Subprocessors &amp; Zero Sale of Data</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            We do <strong>NOT</strong> sell, rent, commercialize, or share your personal health data or Google user data with any advertisers or data brokers. We share data only with trusted technical subprocessors who are contractually bound by confidentiality and data processing agreements:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600 border border-slate-200 rounded-lg">
              <thead className="bg-slate-100 text-slate-800 uppercase font-bold text-[11px]">
                <tr>
                  <th className="p-3 border-b">Subprocessor</th>
                  <th className="p-3 border-b">Purpose</th>
                  <th className="p-3 border-b">Compliance Standards</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-3 font-semibold text-slate-900">Google LLC (Firebase &amp; Cloud)</td>
                  <td className="p-3">User Authentication, Cloud Firestore Database, and Google Analytics 4.</td>
                  <td className="p-3">SOC 2/3, ISO 27001, HIPAA &amp; GDPR Compliant</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900">Google LLC (Gemini API)</td>
                  <td className="p-3">Natural language query processing for medication guidance and interaction screening.</td>
                  <td className="p-3">Google Cloud Terms of Service &amp; Data Processing Addendum</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900">Resend Inc.</td>
                  <td className="p-3">Transactional email delivery for medication expiration warnings and consultation summaries.</td>
                  <td className="p-3">GDPR Compliant, SOC 2 Type II Certified</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900">Vercel Inc. &amp; Render Services</td>
                  <td className="p-3">Frontend application hosting, SSL termination, and API reverse proxy routing.</td>
                  <td className="p-3">SOC 2 Type II Certified, ISO 27001</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Account & Data Deletion */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-lg sm:text-xl border-b border-slate-100 pb-3">
            <Trash2 size={20} className="text-rose-600" />
            <h3>5. Account Deletion &amp; Data Retention Rights</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            In compliance with the <strong>Google Play Store Data Safety and Account Deletion Policy</strong>, users have full autonomy over their personal records:
          </p>
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>In-App Immediate Deletion:</strong> Sign in, open the Profile Menu, click <em>&ldquo;Delete Account &amp; Data&rdquo;</em>, and confirm. All Firestore database documents, audit history, and authentication records are permanently erased immediately.
              </li>
              <li>
                <strong>Web Deletion Portal (Without App):</strong> You can delete your account at any time without reinstalling the app by visiting our dedicated <a href="/delete-account" className="text-rose-600 font-bold underline">Account Deletion Page</a> (<a href="https://dawalens.vercel.app/delete-account" className="text-rose-600 font-bold underline">https://dawalens.vercel.app/delete-account</a>).
              </li>
              <li>
                <strong>Revoke Google OAuth Access:</strong> You can disconnect DawaLens AI&apos;s access to your Google account at any time by visiting{' '}
                <a 
                  href="https://myaccount.google.com/permissions" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#1a73e8] font-bold underline"
                >
                  Google Account Permissions
                </a>.
              </li>
              <li>
                <strong>Email Deletion Request:</strong> You can email our data protection team directly at{' '}
                <a href="mailto:mdnoor4860@gmail.com?subject=Account%20and%20Data%20Deletion%20Request" className="text-rose-600 font-bold underline">
                  mdnoor4860@gmail.com
                </a>{' '}
                with the subject line <em>&ldquo;Account Deletion Request&rdquo;</em>. All records will be verified and permanently purged within 48 to 72 hours.
              </li>
            </ul>
          </div>
        </section>

        {/* 6. Security, Encryption & User Rights */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-3">
            <Lock size={20} className="text-[#0f9d58]" />
            <h3>6. Data Security, Encryption &amp; Your Legal Rights</h3>
          </div>
          <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Encryption in Transit:</strong> All web and API traffic is strictly encrypted using Transport Layer Security (TLS 1.3 / HTTPS).</li>
              <li><strong>Encryption at Rest:</strong> All stored database documents are protected using enterprise AES-256 encryption in Google Cloud Firestore.</li>
              <li><strong>Export &amp; Portability:</strong> You can export your complete medicine vault into CSV format at any time for transfer to Google Sheets or Excel.</li>
              <li><strong>Access &amp; Rectification:</strong> You may edit, update, or correct your medicine records at any time.</li>
              <li><strong>Children&apos;s Privacy (COPPA):</strong> DawaLens AI is not directed to individuals under 13 (or under 16 in the EU/EEA), and we do not knowingly collect information from children.</li>
            </ul>
          </div>
        </section>

        {/* 7. Contact Information */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-3">
            <Mail size={20} className="text-[#0f9d58]" />
            <h3>7. Contact Information &amp; Data Protection Officer</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            For questions regarding our privacy practices, Google API compliance, or data subject requests, contact our developer and data protection officer directly at:
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs sm:text-sm">
            <p><strong>Application:</strong> DawaLens AI</p>
            <p><strong>Primary Developer Email:</strong> <a href="mailto:mdnoor4860@gmail.com" className="text-[#0f9d58] font-bold underline">mdnoor4860@gmail.com</a></p>
            <p><strong>Official Web Domain:</strong> <a href="https://dawalens.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#0f9d58] font-bold underline">https://dawalens.vercel.app</a></p>
            <p><strong>API Infrastructure:</strong> <a href="https://dawalensai.onrender.com" target="_blank" rel="noopener noreferrer" className="text-[#0f9d58] font-bold underline">https://dawalensai.onrender.com</a></p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 sm:px-8 mt-12 text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>&copy; 2026 DawaLens AI. All rights reserved. &bull; Registered Domain: https://dawalens.vercel.app</div>
          <div className="flex items-center gap-4">
            <a href="/" className="hover:text-[#0f9d58] font-semibold transition-colors">Home</a>
            <span>•</span>
            <a href="/guide" className="hover:text-[#0f9d58] font-semibold transition-colors">User Guide</a>
            <span>•</span>
            <a href="/terms" className="hover:text-[#0f9d58] font-semibold transition-colors">Terms</a>
            <span>•</span>
            <a href="/delete-account" className="hover:text-rose-600 font-semibold transition-colors">Delete Account</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
