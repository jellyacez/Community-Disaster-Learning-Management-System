import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon } from "@hugeicons/core-free-icons";

export default function AdminPasswordStrategy({ 
  formData, 
  setFormData, 
  showAutoGenerate, 
  setShowAutoGenerate 
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
          Password Generation
        </label>
        <button
          type="button"
          onClick={() => setShowAutoGenerate(!showAutoGenerate)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
        >
          {showAutoGenerate ? "Enter manually" : "Auto-generate"}
        </button>
      </div>

      {showAutoGenerate ? (
        <div className="flex items-start gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
            <HugeiconsIcon icon={Shield01Icon} size={16} />
          </div>
          <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
            A cryptographically secure password will be generated and
            emailed to the user automatically.
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <HugeiconsIcon
              icon={Shield01Icon}
              size={18}
              className="text-gray-400 dark:text-slate-400"
            />
          </div>
          <input
            type="text"
            required
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            placeholder="Enter temporary password"
          />
        </div>
      )}
    </div>
  );
}
