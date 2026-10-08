import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Trash2, 
  ShieldAlert, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  UserX, 
  Send, 
  Loader2, 
  LogIn, 
  KeyRound
} from 'lucide-react';
import { useEdgeSwipeBack } from '../utils/mobileGestures';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';
import { signInWithGoogleAdaptive } from '../services/nativeAuthService';
import { getApiUrl } from '../utils/apiConfig';

interface AccountDeletionPageProps {
  onBack: () => void;
  user?: { uid: string; email?: string | null; displayName?: string | null } | null;
  onExecuteAccountDeletion?: () => Promise<void>;
}

export const AccountDeletionPage: React.FC<AccountDeletionPageProps> = ({ 
  onBack, 
  user,
  onExecuteAccountDeletion
}) => {
  useEdgeSwipeBack({ onBack });
  const supportEmail = 'newluckypharmacy@gmail.com';

  // State for logged-in deletion confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // State for signing in on this page
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // State for external / web deletion request form
  const [requestEmail, setRequestEmail] = useState('');
  const [requestReason, setRequestReason] = useState('No longer using the application');
  const [requestConfirmed, setRequestConfirmed] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [submissionReference, setSubmissionReference] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSignInOnPage = async () => {
    setIsSigningIn(true);
    setSignInError(null);
    try {
      await signInWithGoogleAdaptive();
      triggerSuccessHaptic();
    } catch (err: any) {
      console.error('Sign-in on deletion page failed:', err);
      setSignInError(err?.message || 'Failed to sign in with Google. Please use the manual request form below.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleInAppDelete = async () => {
    if (!onExecuteAccountDeletion) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onExecuteAccountDeletion();
      setDeleteSuccess(true);
      setShowConfirmModal(false);
      triggerSuccessHaptic();
    } catch (err: any) {
      console.error('Account deletion failed:', err);
      setDeleteError(err.message || 'Failed to complete account deletion. Please re-authenticate and try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleWebFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail.trim() || !requestConfirmed) return;

    setIsSubmittingForm(true);
    setFormError(null);

    try {
      const response = await fetch(getApiUrl('/api/account/deletion-request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: requestEmail.trim(),
          reason: requestReason,
          confirmed: true
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to record deletion request.');
      }

      setSubmissionReference(data.referenceId || `DEL-${Date.now().toString(36).toUpperCase()}`);
      triggerSuccessHaptic();
    } catch (err: any) {
      console.error('Web deletion form submission error:', err);
      setFormError(err.message || 'Server unavailable. You may also email our data protection officer directly.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-900 font-sans selection:bg-rose-500 selection:text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 active:scale-95 cursor-pointer"
              title="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Trash2 size={18} className="text-rose-600" />
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Account &amp; Data Deletion Portal
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Document */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-8 py-8 space-y-8">
        {/* Title */}
        <div className="border-b border-slate-200 pb-6 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert size={12} /> Google Play Store &amp; Indus Appstore Data Safety
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Permanent Account &amp; Medication Vault Deletion
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            In compliance with Google Play Store User Data policies, Indian Digital Personal Data Protection (DPDP) Act 2023, and global privacy standards, you have the right to permanently purge your account and all associated health records.
          </p>
        </div>

        {/* Immediate Deletion Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <UserX size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Direct Self-Service Deletion</h3>
              <p className="text-xs text-slate-500 mt-1">
                Authenticate with your registered Google account to immediately and irreversibly delete your account, Firestore vault, and push notification tokens.
              </p>
            </div>
          </div>

          {deleteSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 size={18} className="text-emerald-600" />
                Account &amp; Data Successfully Deleted
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Your authentication account, cloud medicine records, dose history, and device caches have been completely wiped. You may now safely close this window or uninstall the application.
              </p>
            </div>
          ) : user ? (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Signed In Account</div>
                  <div className="text-sm font-bold text-slate-800">{user.email || user.uid}</div>
                </div>
                <button
                  onClick={() => {
                    triggerLightHaptic();
                    setShowConfirmModal(true);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete My Account Now
                </button>
              </div>

              {deleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {deleteError}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-600">
                You are currently not signed in. You can sign in with Google below to proceed with immediate self-service account deletion:
              </p>
              <button
                onClick={handleSignInOnPage}
                disabled={isSigningIn}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSigningIn ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                Sign In with Google to Delete Account
              </button>
              {signInError && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                  {signInError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* What Is Deleted / Retained Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database size={18} className="text-[#0f9d58]" />
            Data Deletion &amp; Retention Breakdown
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-2.5 px-3 font-bold text-slate-700">Category</th>
                  <th className="py-2.5 px-3 font-bold text-slate-700">Specific Data Handled</th>
                  <th className="py-2.5 px-3 font-bold text-slate-700">Action &amp; Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Auth &amp; Profile</td>
                  <td className="py-2.5 px-3">Google Auth UID, email address, profile name, photo URL</td>
                  <td className="py-2.5 px-3 text-rose-600 font-bold">Deleted immediately</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Medication Records</td>
                  <td className="py-2.5 px-3">Medicine names, dosages, expiry dates, schedules, forms, quantities</td>
                  <td className="py-2.5 px-3 text-rose-600 font-bold">Deleted immediately</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Dose &amp; Edit History</td>
                  <td className="py-2.5 px-3">All subcollection history documents and audit logs</td>
                  <td className="py-2.5 px-3 text-rose-600 font-bold">Deleted immediately</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">AI Consultations</td>
                  <td className="py-2.5 px-3">All chat messages, advice history, and consultation logs</td>
                  <td className="py-2.5 px-3 text-rose-600 font-bold">Deleted immediately</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Notification Tokens</td>
                  <td className="py-2.5 px-3">FCM device tokens and server-side background schedules</td>
                  <td className="py-2.5 px-3 text-rose-600 font-bold">Deleted immediately</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Physical Device Cache</td>
                  <td className="py-2.5 px-3">IndexedDB photo storage, localStorage preferences</td>
                  <td className="py-2.5 px-3 text-rose-600 font-bold">Cleared on device</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Server Logs (Non-Health)</td>
                  <td className="py-2.5 px-3">Aggregated HTTP status codes and security access logs (no PII or pill images)</td>
                  <td className="py-2.5 px-3 text-amber-700">Retained up to 14 days for anti-abuse &amp; DDoS audit, then automatically purged</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Cloud Disaster Snapshots</td>
                  <td className="py-2.5 px-3">Automated cloud backup snapshots</td>
                  <td className="py-2.5 px-3 text-amber-700">Rotated and overwritten within 30 days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Fallback Web Form (Without App Installed) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <Mail size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Web Deletion Request (Without App Installed)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                If you have uninstalled DawaSnap AI or cannot sign in with Google, submit this official request form. Our data governance team will verify and execute complete account and vault deletion within 7 business days.
              </p>
            </div>
          </div>

          {submissionReference ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 size={18} className="text-emerald-600" />
                Deletion Request Registered
              </div>
              <p className="text-xs text-emerald-800">
                Your request has been officially recorded. Reference ID: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300">{submissionReference}</strong>
              </p>
              <p className="text-[11px] text-emerald-700">
                All records associated with your email will be verified and purged within 7 business days.
              </p>
            </div>
          ) : (
            <form onSubmit={handleWebFormSubmit} className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered Account Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f9d58]/30 focus:border-[#0f9d58]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Deletion (Optional)
                </label>
                <select
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f9d58]/30 focus:border-[#0f9d58]"
                >
                  <option value="No longer using the application">No longer using the application</option>
                  <option value="Privacy concerns">Privacy concerns</option>
                  <option value="Switching medication management method">Switching medication management method</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="confirm-web-delete"
                  checked={requestConfirmed}
                  onChange={(e) => setRequestConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#0f9d58] focus:ring-[#0f9d58]"
                  required
                />
                <label htmlFor="confirm-web-delete" className="text-xs text-slate-600 leading-snug">
                  I understand that this action is irreversible and will permanently delete all my medicine records, dose logs, and personal profile from DawaSnap AI.
                </label>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingForm || !requestConfirmed || !requestEmail}
                className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingForm ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Submit Formal Deletion Request
              </button>
            </form>
          )}
        </div>

        {/* Compliance & Contact */}
        <div className="p-6 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-2">
          <div className="font-bold text-slate-800">Operator &amp; Grievance Redressal</div>
          <div><strong>Operator:</strong> Noor Technologies (MD Hassan)</div>
          <div><strong>Grievance Officer:</strong> MD Hassan</div>
          <div><strong>Contact Email:</strong> {supportEmail}</div>
          <div><strong>Physical Address:</strong> India</div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
            You may also revoke Google Account OAuth access directly via Google Account Security: <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-[#0f9d58] underline">https://myaccount.google.com/permissions</a>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Confirm Irreversible Deletion</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Type <strong>DELETE</strong> below to permanently erase your account, all recorded medications, and notification schedules.
              </p>
            </div>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-center font-mono font-bold text-sm text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmText('');
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleInAppDelete}
                disabled={confirmText !== 'DELETE' || isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Confirm &amp; Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
