import React from "react";

export default function TermsCheckbox({
  acceptedTerms,
  setAcceptedTerms,
  setShowTermsModal,
  setShowPrivacyModal
}) {
  return (
    <div className="space-y-3 mt-4 mb-2">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="terms"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-1 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
        />
        <label htmlFor="terms" className="text-xs text-gray-600 cursor-pointer leading-relaxed">
          By selecting "Create Account", I agree to the{" "}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}
            className="text-red-600 font-semibold hover:underline"
          >
            Terms & Conditions
          </button>{" "}
          and{" "}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }}
            className="text-red-600 font-semibold hover:underline"
          >
            Privacy Policy
          </button>
          .
        </label>
      </div>
    </div>
  );
}
