import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon, CheckmarkBadge01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import useDialogFocus from "../../../hooks/useDialogFocus";
import Spinner from "../Spinner";

export default function ExplicitConsentModal({ isOpen, onCancel, onConfirm, isSubmitting }) {
  // Escape does nothing while the account is being created
  const dialogRef = useDialogFocus(isOpen, onCancel, { canClose: !isSubmitting });
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-modal-title"
        aria-describedby="consent-modal-desc"
        className="auth-isolated bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none outline-none"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-50 text-red-700 rounded-lg">
              <HugeiconsIcon aria-hidden="true" icon={Shield01Icon} className="w-5 h-5" />
            </div>
            <h2 id="consent-modal-title" className="text-lg font-bold text-gray-900">Important Consent Required</h2>
          </div>
          <button
            type="button"
            aria-label="Close and go back to the form"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex h-11 w-11 items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            <HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 text-gray-700 text-sm space-y-4">
          <p id="consent-modal-desc">
            Before we create your account, The Data Privacy Act of 2012 (Republic Act No. 10173) requires us to be completely transparent about your data.
          </p>
          
          <div className="bg-gray-50 p-4 rounded-xl space-y-3">
            <h3 className="font-semibold text-gray-900 text-base">We will securely collect and store:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <HugeiconsIcon aria-hidden="true" icon={CheckmarkBadge01Icon} className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />
                <span><strong>Your Name & Email</strong> to issue your official DRRM completion certificates.</span>
              </li>
              <li className="flex items-start gap-2">
                <HugeiconsIcon aria-hidden="true" icon={CheckmarkBadge01Icon} className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />
                <span><strong>Your Barangay</strong> to help the MDRRMO track municipal disaster readiness.</span>
              </li>
              <li className="flex items-start gap-2">
                <HugeiconsIcon aria-hidden="true" icon={CheckmarkBadge01Icon} className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />
                <span><strong>Your IP Address & Activity Logs</strong> to secure your account against hackers and monitor active sessions.</span>
              </li>
            </ul>
          </div>
          
          <p className="font-medium text-gray-700">
            By clicking "I Understand and Consent", you explicitly agree to this collection. You can request account deletion at any time via your Security Settings.
          </p>
        </div>
        
        <div className="p-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="min-h-11 px-5 py-2.5 text-gray-900 font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 w-full sm:w-auto outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => !isSubmitting && onConfirm()}
            aria-disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="min-h-11 px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors aria-disabled:bg-gray-300 aria-disabled:text-gray-800 aria-disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
          >
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4" />
                Creating account…
              </>
            ) : (
              "I Understand and Consent"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
