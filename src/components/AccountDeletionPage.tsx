import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Trash2, 
  ShieldAlert, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  UserX, 
  Send,
  Loader2
} from 'lucide-react';

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
  const supportEmail = 'mdnoor4860@gmail.com';
  const displayEmail = 'mdnoor4860@gmail.com';

  // State for logged-in deletion confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // State for external / web deletion request (Google Play compliant web request)
  const [requestEmail, setRequestEmail] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const handleInAppDelete = async () => {
    if (!onExecuteAccountDeletion) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onExecuteAccountDeletion();
      setDeleteSuccess(true);
      setShowConfirmModal(false);
    } catch (err: any) {
      console.error('Account deletion failed:', err);
      setDeleteError(err.message || 'Failed to delete account. Please try signing in again or contact support.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleWebSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail.trim()) return;
    
    const subject = encodeURIComponent(`Account and Data Deletion Request - ${requestEmail.trim()}`);
    const body = encodeURIComponent(
      `Hello DawaLens AI Data Protection Team,\n\nI am requesting permanent deletion of my DawaLens AI account and all associated data under Google Play Data Safety policies.\n\nRegistered Account Email: ${requestEmail.trim()}\n\nPlease confirm when all medication logs, user profile data, and database records have been purged.\n\nThank you.`
    );
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    setRequestSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-rose-500 selection:text-white flex flex-col">
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
              <Trash2 size={18} className="text-rose-600" />
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Delete Account & Data
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Minimal Document */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 space-y-10">
        {/* Title */}
        <div className="border-b border-slate-100 pb-6 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">
            <ShieldAlert size={11} /> Google Play Data Safety Compliance
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Account & Data Deletion
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            In compliance with the <strong>Google Play Store Account Deletion Policy</strong>, DawaLens AI provides users with a direct, transparent mechanism to permanently delete their account and all associated personal and health data outside and inside of the app.
          </p>
        </div>

        {/* What Data Is Deleted */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database size={16} className="text-rose-600" />
            What Data Is Deleted Upon Request?
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            When you request account deletion, all records tied to your account identifier are permanently destroyed without secondary retention:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
            <li><strong className="text-slate-800">User Account Profile:</strong> Your Google authentication link, email address, profile name, and user ID.</li>
            <li><strong className="text-slate-800">All Medication Records:</strong> Medicine names, dosage strengths, expiration dates, stock quantities, and forms.</li>
            <li><strong className="text-slate-800">Usage & History Logs:</strong> All audit logs, dose-taken timestamps, and custom notes.</li>
            <li><strong className="text-slate-800">On-Device Local Photo Cache:</strong> Sandboxed IndexedDB camera images stored on your physical device are purged.</li>
          </ul>
          <p className="text-xs text-slate-500 pt-1">
            <strong>Retention Period:</strong> None. 100% of data is permanently deleted within 48 hours (instant if executed in-app).
          </p>
        </section>

        {/* Option 1: In-App Immediate Deletion (If Logged In) - Highlight Box where required */}
        {user ? (
          <section className="p-5 bg-rose-50/70 border-l-4 border-rose-600 rounded-r-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-800">
              <UserX size={18} />
              <h3 className="text-sm font-black uppercase tracking-wide">
                Immediate In-App Deletion
              </h3>
            </div>
            <p className="text-sm text-rose-900 leading-relaxed font-medium">
              You are signed in as <strong className="font-mono text-black">{user.email}</strong>. You can permanently wipe your account and all records now:
            </p>

            {deleteSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#0f9d58]" />
                Your account and all associated data have been permanently deleted.
              </div>
            ) : (
              <div>
                {deleteError && (
                  <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-xs rounded-xl mb-3 font-semibold">
                    {deleteError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold transition-all shadow-xs active:scale-98 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  Delete My Account & All Data Now
                </button>
              </div>
            )}
          </section>
        ) : null}

        {/* Option 2: Web Deletion Request (Without Logging In) */}
        <section className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail size={16} className="text-[#0f9d58]" />
            Request Deletion Without Logging In
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            If you have uninstalled the application or cannot sign in, submit your registered email below or email us directly at{' '}
            <a 
              href={`mailto:${supportEmail}?subject=Account%20and%20Data%20Deletion%20Request`} 
              className="text-rose-600 font-bold hover:underline"
            >
              {displayEmail}
            </a>. Your data will be permanently wiped within 48 hours.
          </p>

          {requestSubmitted ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 size={15} className="text-[#0f9d58]" /> Deletion Request Dispatched
              </span>
              <p>Your request has been submitted for <strong>{requestEmail}</strong>. All databases and records will be purged within 48 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleWebSubmit} className="space-y-3 max-w-md pt-1">
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Your registered email address..."
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98 flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Send size={13} />
                  Submit Request
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Contact Desk */}
        <section className="pt-4 border-t border-slate-100 space-y-2">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail size={16} className="text-[#0f9d58]" />
            Data Protection Desk
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            For questions regarding data privacy or account removal, contact our data protection team directly at{' '}
            <a 
              href={`mailto:${supportEmail}?subject=Data%20Protection%20Inquiry%20-%20DawaLens%20AI`} 
              className="text-[#0f9d58] font-bold hover:underline"
            >
              {displayEmail}
            </a>.
          </p>
        </section>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            
            <div className="text-center space-y-1">
              <h4 className="text-lg font-bold text-slate-900">Permanent Account Deletion</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                This action is irreversible. All your stored medications, dosages, history logs, and profile will be permanently deleted from the cloud.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold uppercase text-slate-600 block">
                Type <span className="text-rose-600 font-mono">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 border border-rose-200 rounded-xl text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInAppDelete}
                disabled={confirmText.trim().toUpperCase() !== 'DELETE' || isDeleting}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  'Confirm & Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="border-t border-slate-100 py-6 px-4 sm:px-8 mt-12 text-xs text-slate-500">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>&copy; 2026 DawaLens AI. Registered Domain: https://dawalens.vercel.app</div>
          <div className="flex items-center gap-4">
            <a href="/manual" className="hover:text-[#0f9d58] font-semibold transition-colors">User Guide</a>
            <span>•</span>
            <a href="/privacy" className="hover:text-[#0f9d58] font-semibold transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="/terms" className="hover:text-[#0f9d58] font-semibold transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
