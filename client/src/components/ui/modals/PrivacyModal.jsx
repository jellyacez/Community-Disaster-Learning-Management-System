import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

export default function PrivacyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto prose prose-red max-w-none text-gray-600 text-sm">
          <p className="font-semibold text-gray-900 mb-4">
            Your privacy is critically important to us. This Privacy Policy explains how we collect, use, and protect your personal information within the Community Disaster Learning Management System.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">1. Information We Collect</h3>
          <p className="mb-2">We only collect the information necessary to provide our educational services effectively:</p>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li><strong>Account Data:</strong> Your full name, email address, and encrypted password.</li>
            <li><strong>Demographics:</strong> Your designated Barangay for localizing disaster preparedness modules.</li>
            <li><strong>System Data:</strong> Your active sessions, IP address, and browser type for security monitoring.</li>
          </ul>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">2. How We Use Your Information</h3>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>To authenticate your login and secure your account.</li>
            <li>To track your progress in the disaster training modules.</li>
            <li>To communicate critical announcements or platform updates.</li>
          </ul>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">3. Data Security</h3>
          <p className="mb-4">
            We implement industry-standard encryption (e.g., bcrypt password hashing) and secure cookies to protect your data from unauthorized access. Your active devices can be managed and revoked directly from your account settings.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">4. Sharing of Information</h3>
          <p className="mb-4">
            We do not sell, trade, or rent your personal identification information to others. Your progress and name may be visible to designated Barangay Admins or MDRRMO Admins strictly for the purpose of monitoring community readiness.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">5. Your Rights</h3>
          <p className="mb-4">
            You have the right to request access to the data we hold about you, or request account archival/deletion by contacting your System Administrator.
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
