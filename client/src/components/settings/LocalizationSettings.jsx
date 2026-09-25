import { HugeiconsIcon } from "@hugeicons/react";
import {
  Globe02Icon,
  PaintBoardIcon,
  InformationCircleIcon,
  Sun01Icon,
  Moon02Icon,
  ComputerIcon,
} from "@hugeicons/core-free-icons";
import { useTheme } from "../../hooks/context/themeContext";

export default function LocalizationSettings() {
  const { theme, setTheme } = useTheme();

  const handleSetTheme = (mode) => {
    if (mode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
      localStorage.removeItem("bacolor_theme");
      return;
    }
    setTheme(mode);
  };

  return (
    <div className="p-6 md:p-8 w-full flex flex-col space-y-4">
      {/* Language Preference Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors group">
        <div className="md:w-1/3 shrink-0">
          <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HugeiconsIcon icon={Globe02Icon} className="w-5 h-5 text-red-500" />
            <label htmlFor="languagePreference">Language Preference</label>
          </h4>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Select your primary language for the platform.
          </p>
          <div className="mt-3">
            <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
              Under Development
            </span>
          </div>
        </div>

        <div className="md:w-2/3 max-w-md space-y-3">
          <div className="rounded-xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30 p-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400"
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
              className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-4 py-3 text-sm font-medium cursor-not-allowed appearance-none focus:outline-none"
            >
              <option value="en">English (Default)</option>
              <option value="tl">Tagalog (Coming Soon)</option>
              <option value="pam">Kapampangan (Coming Soon)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Theme Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors group">
        <div className="md:w-1/3 shrink-0">
          <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HugeiconsIcon icon={PaintBoardIcon} className="w-5 h-5 text-red-500" />
            Theme
          </h4>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Customize the interface appearance.
          </p>
        </div>

        <div className="md:w-2/3 max-w-md">
          <div className="flex flex-wrap items-center gap-2 bg-gray-100/70 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-700 w-fit">
            {/* Light Mode Button */}
            <button
              type="button"
              onClick={() => handleSetTheme("light")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                theme === "light"
                  ? "bg-white shadow-sm border border-gray-200/80 text-gray-900"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white"
              }`}
            >
              <HugeiconsIcon
                icon={Sun01Icon}
                className={`w-4 h-4 ${theme === "light" ? "text-amber-500" : "text-gray-400 dark:text-slate-400"}`}
              />
              Light
            </button>

            {/* Dark Mode Button */}
            <button
              type="button"
              onClick={() => handleSetTheme("dark")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                theme === "dark"
                  ? "bg-slate-950 text-white shadow-sm border border-slate-700"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white"
              }`}
            >
              <HugeiconsIcon
                icon={Moon02Icon}
                className={`w-4 h-4 ${theme === "dark" ? "text-indigo-400" : "text-gray-400 dark:text-slate-400"}`}
              />
              Dark
            </button>

            {/* System Default Button */}
            <button
              type="button"
              onClick={() => handleSetTheme("system")}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
            >
              <HugeiconsIcon icon={ComputerIcon} className="w-4 h-4 text-gray-400 dark:text-slate-400" />
              System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
