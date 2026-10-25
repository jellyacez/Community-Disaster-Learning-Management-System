import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import useDialogFocus from "../../../hooks/useDialogFocus";

export default function PrivacyModal({ isOpen, onClose }) {
  const dialogRef = useDialogFocus(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-modal-title"
        className="auth-isolated bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none outline-none"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 id="privacy-modal-title" className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
          <button
            type="button"
            data-initial-focus
            onClick={onClose}
            aria-label="Close Privacy Policy"
            className="inline-flex h-11 w-11 items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            <HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} className="w-5 h-5" />
          </button>
        </div>
        <div className="p-0 overflow-hidden w-full h-[60vh] bg-white">
          <iframe 
            src="/termly-privacy.html" 
            title="Privacy Policy text"
            className="w-full h-full border-none"
          />
        </div>
        
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-6 py-2 bg-gray-100 text-gray-900 font-semibold rounded-xl hover:bg-gray-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
