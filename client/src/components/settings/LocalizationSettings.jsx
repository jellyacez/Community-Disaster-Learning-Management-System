import { HugeiconsIcon } from "@hugeicons/react";
import { Globe02Icon, PaintBoardIcon } from "@hugeicons/core-free-icons";

export default function LocalizationSettings() {
  return (
    <div className="p-6 md:p-8 w-full flex flex-col space-y-2">
      {/* Language Preference Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors group">
        <div className="md:w-1/3 flex-shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={Globe02Icon} className="w-5 h-5 text-red-500" />
            <label htmlFor="languagePreference">Language Preference</label>
          </h4>
          <p className="text-sm text-gray-500 mt-1">Select your primary language for the platform. Currently, modules are translated automatically.</p>
        </div>
        <div className="md:w-2/3 max-w-md">
          <select id="languagePreference" name="languagePreference" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white">
            <option value="en">English</option>
            <option value="tl">Tagalog</option>
            <option value="pam">Kapampangan</option>
          </select>
        </div>
      </div>

      {/* Theme Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors group">
        <div className="md:w-1/3 flex-shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={PaintBoardIcon} className="w-5 h-5 text-red-500" />
            Theme
          </h4>
          <p className="text-sm text-gray-500 mt-1">Customize the interface appearance.</p>
        </div>
        <div className="md:w-2/3 max-w-md">
          <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 w-fit">
            <button className="px-4 py-1.5 rounded-lg bg-white shadow-sm border border-gray-200 text-sm font-bold text-gray-900">Light</button>
            <button className="px-4 py-1.5 rounded-lg text-gray-500 text-sm font-medium hover:text-gray-900 transition">Dark</button>
            <button className="px-4 py-1.5 rounded-lg text-gray-500 text-sm font-medium hover:text-gray-900 transition">System</button>
          </div>
        </div>
      </div>
    </div>
  );
}
