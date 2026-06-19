import React from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function VerifyEmailPromptPage() {
  useDocumentTitle("Check Your Email | Bacolor LMS");

  const location = useLocation();
  const email = location.state?.email;

  if (!email) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-red-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
          <HugeiconsIcon icon={Mail01Icon} className="w-10 h-10" />
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          Verify Your Email
        </h1>

        <p className="text-gray-600 mb-6 leading-relaxed">
          We've sent a verification link to <br />
          <span className="font-bold text-gray-900">{email}</span>
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 text-sm text-blue-800 text-left">
          <p className="font-semibold mb-1">Next Steps:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Open your email inbox</li>
            <li>Click the verification link we sent you</li>
            <li>You will be automatically logged in!</li>
          </ul>
        </div>

        <Link
          to="/signin"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200 transition"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
