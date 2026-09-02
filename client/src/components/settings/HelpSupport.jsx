// client/src/components/settings/HelpSupport.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function HelpSupport() {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
            {/* HelpCircle Icon (Native SVG) */}
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Help & Support</h3>
            <p className="text-sm text-gray-500">
              Need assistance or want to report an issue with the LMS?
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-gray-50 p-4 border border-gray-100">
        <p className="text-sm text-gray-700 leading-relaxed">
          The Bacolor MDRRMO support desk can assist with training certificate verification,
          course completion tracking, and system feedback.
        </p>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/user/feedback")}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          {/* MessageSquare Icon (Native SVG) */}
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Submit Feedback / Contact Support
        </button>
      </div>
    </div>
  );
}