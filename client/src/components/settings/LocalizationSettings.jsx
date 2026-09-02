import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Globe02Icon, PaintBoardIcon, InformationCircleIcon } from "@hugeicons/core-free-icons";

export default function LocalizationSettings() {
  return (
    <div className="p-6 md:p-8 w-full flex flex-col space-y-4">
      {/* Language Preference Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors group">
        <div className="md:w-1/3 shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={Globe02Icon} className="w-5 h-5 text-red-500" />
            <label htmlFor="languagePreference">Language Preference</label>
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            Select your primary language for the platform.
          </p>
          <div className="mt-3">
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
              Under Development
            </span>
          </div>
        </div>

        <div className="md:w-2/3 max-w-md space-y-3">
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 flex items-start gap-2.5 text-xs text-amber-800">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              className="w-4 h-4 shrink-0 mt-0.5 text-amber-600"
            />
            <span>
              Kapampangan and Tagalog dialect translations are currently being finalized for the DRRM curriculum.
            </span>
          </div>

          <div className="relative opacity-60">
            <select
              id="languagePreference"
              name="languagePreference"
              disabled
              aria-disabled="true"
              defaultValue="en"
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-medium text-gray-500 cursor-not-allowed appearance-none focus:outline-none"
            >
              <option value="en">English (Default)</option>
              <option value="tl">Tagalog (Coming Soon)</option>
              <option value="pam">Kapampangan (Coming Soon)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Theme Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors group">
        <div className="md:w-1/3 shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={PaintBoardIcon} className="w-5 h-5 text-red-500" />
            Theme
          </h4>
          <p className="text-sm text-gray-500 mt-1">Customize the interface appearance.</p>
        </div>

        <div className="md:w-2/3 max-w-md">
          <div className="flex flex-wrap items-center gap-2 bg-gray-100/70 p-1.5 rounded-xl border border-gray-200 w-fit opacity-60">
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="px-4 py-1.5 rounded-lg bg-white shadow-sm border border-gray-200 text-sm font-bold text-gray-700 cursor-not-allowed"
            >
              Light (Active)
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="px-4 py-1.5 rounded-lg text-gray-400 text-sm font-medium cursor-not-allowed"
            >
              Dark (Soon)
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="px-4 py-1.5 rounded-lg text-gray-400 text-sm font-medium cursor-not-allowed"
            >
              System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}