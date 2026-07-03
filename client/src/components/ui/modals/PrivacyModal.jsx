import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

export default function PrivacyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto prose prose-red max-w-none text-gray-700 text-sm">
          <p className="font-semibold text-gray-900 mb-6 text-base">
            Your privacy is critically important to us. This Privacy Policy explains how we collect, use, and protect your personal information in compliance with The Data Privacy Act of 2012 (Republic Act No. 10173).
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2 border-b pb-2">1. Information We Collect</h3>
          <p className="mb-2">We strictly collect only the information necessary to provide you with Disaster Risk Reduction and Management (DRRM) training. This includes:</p>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li><strong>Personal Identifiers:</strong> Your full name and email address.</li>
            <li><strong>Demographics:</strong> Your affiliated barangay.</li>
            <li><strong>System Data:</strong> Activity records, module progress, and IP addresses for security logging.</li>
          </ul>
          
          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2 border-b pb-2">2. How We Use Your Information</h3>
          <p className="mb-2">Your data is never sold. It is strictly used to:</p>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>Facilitate your access to personalized DRRM modules.</li>
            <li>Generate official certification upon course completion.</li>
            <li>Secure your account through mechanisms like Two-Factor Authentication.</li>
            <li>Allow local government units (MDRRMO, Barangay Admins) to track community disaster preparedness levels.</li>
          </ul>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2 border-b pb-2">3. Data Security & Protection</h3>
          <p className="mb-4">
            We implement enterprise-grade security measures. Your passwords are cryptographically hashed and never stored in plain text. We utilize HTTPS, secure HTTP-only session cookies, strict CORS policies, and rate-limiting to defend against unauthorized access and brute-force attacks.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2 border-b pb-2">4. Your Right to Erasure (Right to be Forgotten)</h3>
          <p className="mb-4">
            You have the absolute right to request the deletion of your account. When executed, our automated deletion pipeline permanently destroys your personal data (name, email, activity logs) from our active databases. Any DRRM certifications you achieved will be strictly anonymized (stripped of all Personally Identifiable Information) to retain municipal readiness statistics without compromising your privacy.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2 border-b pb-2">5. Contact Us</h3>
          <p className="mb-4">
            For privacy-related inquiries, data corrections, or manual deletion requests, please contact the Bacolor MDRRMO administrative office.
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
