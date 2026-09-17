import { useTheme } from "../../context/themeContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun01Icon, Moon02Icon } from "@hugeicons/core-free-icons";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center ${className}`}
      aria-label="Toggle display theme"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <HugeiconsIcon icon={Sun01Icon} className="w-5 h-5 text-amber-400" />
      ) : (
        <HugeiconsIcon icon={Moon02Icon} className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );
}