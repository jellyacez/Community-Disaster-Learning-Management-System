import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import useDialogFocus from "../../../hooks/useDialogFocus";

export default function TermsModal({ isOpen, onClose }) {
  const dialogRef = useDialogFocus(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
        className="auth-isolated bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none outline-none"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 id="terms-modal-title" className="text-2xl font-bold text-gray-900">Terms & Conditions</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Terms and Conditions"
            className="inline-flex h-11 w-11 items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            <HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} className="w-5 h-5" />
          </button>
        </div>
        
        <div tabIndex={0} data-initial-focus role="region" aria-label="Terms and Conditions text" className="p-6 overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900 prose prose-red max-w-none text-gray-700 text-sm">
          <p className="font-semibold text-gray-900 mb-6 text-base">
            Welcome to the Community Disaster Learning Management System. By accessing or using our platform, you agree to be bound by these Terms and Conditions.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2 border-b pb-2">1. Acceptance of Terms</h3>
          <p className="mb-4">
            By creating an account and utilizing the Community Disaster Learning Management System, you agree to comply with and be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use the service.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2 border-b pb-2">2. User Accounts, Security, & Privacy</h3>
          <p className="mb-4">
            You are entirely responsible for maintaining the confidentiality of your account credentials. You agree to notify administrators immediately of any unauthorized use of your account. In accordance with The Data Privacy Act of 2012 (Republic Act No. 10173), by using this platform, you explicitly consent to active IP and device tracking for security monitoring to protect your account from malicious access.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2 border-b pb-2">3. Appropriate Use</h3>
          <p className="mb-4">
            The platform is provided solely for educational and administrative purposes relating to Disaster Risk Reduction and Management. Any attempt to disrupt, hack, reverse-engineer, or maliciously overload the system is strictly prohibited and will result in immediate termination of access and potential legal action.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2 border-b pb-2">4. Intellectual Property</h3>
          <p className="mb-4">
            All training modules, text, graphics, and interface designs are the intellectual property of the Bacolor MDRRMO or its respective licensors. You may not distribute, modify, or transmit the contents of this site without prior written consent.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2 border-b pb-2">5. Disclaimer of Warranties</h3>
          <p className="mb-4">
            While we strive to provide accurate and life-saving information, the materials on this site are provided "as is" without any express or implied warranty of any kind. We are not liable for any damages or injuries resulting from the application or misapplication of the training material during an actual disaster.
          </p>
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
