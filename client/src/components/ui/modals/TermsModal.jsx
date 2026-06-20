import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

export default function TermsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Terms & Conditions</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto prose prose-red max-w-none text-gray-600 text-sm">
          <p className="font-semibold text-gray-900 mb-4">
            Welcome to the Community Disaster Learning Management System. By accessing or using our platform, you agree to be bound by these Terms and Conditions.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">1. Acceptance of Terms</h3>
          <p className="mb-4">
            By creating an account, you confirm that you have read, understood, and agree to these terms. If you do not agree, you must not use our services.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">2. User Account Responsibilities</h3>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You agree to provide accurate and up-to-date information during registration.</li>
            <li>Any activity occurring under your account is your sole responsibility.</li>
          </ul>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">3. Account Security and Device Monitoring</h3>
          <p className="mb-4">
            To protect your account from unauthorized access and potential hijacking, the system actively monitors and logs the IP addresses and device types (User-Agent) used to access your account. By using this platform, you explicitly consent to this security tracking. You may review and revoke active sessions at any time through your account settings.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">4. Use of the Platform</h3>
          <p className="mb-4">
            This system is designed for community disaster preparedness training. You agree not to use the platform for any illegal or unauthorized purpose.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">5. Content and Modules</h3>
          <p className="mb-4">
            All training modules, text, graphics, and resources provided on this platform are for educational purposes. The platform makes no guarantees regarding the absolute accuracy of user-submitted or externally sourced disaster information.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">6. Termination</h3>
          <p className="mb-4">
            We reserve the right to suspend or terminate your account at any time if we suspect a violation of these terms or any fraudulent activity.
          </p>
        </div>
        
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
