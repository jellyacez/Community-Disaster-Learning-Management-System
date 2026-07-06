import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon, CheckmarkBadge01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

export default function ExplicitConsentModal({ isOpen, onCancel, onConfirm, isSubmitting }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-modal-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <HugeiconsIcon aria-hidden="true" icon={Shield01Icon} className="w-5 h-5" />
            </div>
            <h2 id="consent-modal-title" className="text-lg font-bold text-gray-900">Important Consent Required</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 text-gray-600 text-sm space-y-4">
          <p>
            Before we create your account, The Data Privacy Act of 2012 (Republic Act No. 10173) requires us to be completely transparent about your data.
          </p>
          
          <div className="bg-gray-50 p-4 rounded-xl space-y-3">
            <h3 className="font-semibold text-gray-900 text-base">We will securely collect and store:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <HugeiconsIcon aria-hidden="true" icon={CheckmarkBadge01Icon} className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Your Name & Email</strong> to issue your official DRRM completion certificates.</span>
              </li>
              <li className="flex items-start gap-2">
                <HugeiconsIcon aria-hidden="true" icon={CheckmarkBadge01Icon} className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Your Barangay</strong> to help the MDRRMO track municipal disaster readiness.</span>
              </li>
              <li className="flex items-start gap-2">
                <HugeiconsIcon aria-hidden="true" icon={CheckmarkBadge01Icon} className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
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
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
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
