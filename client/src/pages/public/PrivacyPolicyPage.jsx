import React from "react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Link } from "react-router-dom";

export default function PrivacyPolicyPage() {
  useDocumentTitle("Privacy Policy | Bacolor LMS");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-red-600 px-8 py-6">
          <h1 className="text-3xl font-bold text-white">Data Privacy Policy</h1>
          <p className="text-red-100 mt-2">Community Disaster Learning Management System</p>
        </div>
        
        <div className="p-8 prose prose-red max-w-none text-gray-700">
          <p className="font-semibold text-gray-900 mb-6 text-lg">
            Your privacy is critically important to us. This Privacy Policy explains how we collect, use, and protect your personal information in compliance with The Data Privacy Act of 2012 (Republic Act No. 10173).
          </p>

          <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 border-b pb-2">1. Information We Collect</h3>
          <p className="mb-4">We strictly collect only the information necessary to provide you with Disaster Risk Reduction and Management (DRRM) training. This includes:</p>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li><strong>Personal Identifiers:</strong> Your full name and email address.</li>
            <li><strong>Demographics:</strong> Your affiliated barangay.</li>
            <li><strong>System Data:</strong> Activity records, module progress, and IP addresses for security logging.</li>
          </ul>
          
          <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 border-b pb-2">2. How We Use Your Information</h3>
          <p className="mb-4">Your data is never sold. It is strictly used to:</p>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li>Facilitate your access to personalized DRRM modules.</li>
            <li>Generate official certification upon course completion.</li>
            <li>Secure your account through mechanisms like Two-Factor Authentication.</li>
            <li>Allow local government units (MDRRMO, Barangay Admins) to track community disaster preparedness levels.</li>
          </ul>

          <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 border-b pb-2">3. Data Security & Protection</h3>
          <p className="mb-6">
            We implement enterprise-grade security measures. Your passwords are cryptographically hashed and never stored in plain text. We utilize HTTPS, secure HTTP-only session cookies, strict CORS policies, and rate-limiting to defend against unauthorized access and brute-force attacks.
          </p>

          <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 border-b pb-2">4. Your Right to Erasure (Right to be Forgotten)</h3>
          <p className="mb-6">
            You have the absolute right to request the deletion of your account. When executed, our automated deletion pipeline permanently destroys your personal data (name, email, activity logs) from our active databases. Any DRRM certifications you achieved will be strictly anonymized (stripped of all Personally Identifiable Information) to retain municipal readiness statistics without compromising your privacy.
          </p>

          <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 border-b pb-2">5. Contact Us</h3>
          <p className="mb-8">
            For privacy-related inquiries, data corrections, or manual deletion requests, please contact the Bacolor MDRRMO administrative office.
          </p>
          
          <div className="mt-10 flex justify-center">
            <Link to="/" className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
