import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CustomerSupportIcon } from "@hugeicons/core-free-icons";

export default function HelpSupport() {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm h-full flex flex-col justify-center">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-red-50 p-2.5 rounded-xl text-red-600">
            <HugeiconsIcon aria-hidden="true" icon={CustomerSupportIcon} className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Help & Support</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Need assistance? We're here to help.
            </p>
          </div>
        </div>
        
        <a
          href="mailto:support@bacolorlms.com"
          className="whitespace-nowrap relative inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
