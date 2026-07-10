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
        <label className="block text-sm font-semibold text-gray-700">
          Password Generation
        </label>
        <button
          type="button"
          onClick={() => setShowAutoGenerate(!showAutoGenerate)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          {showAutoGenerate ? "Enter manually" : "Auto-generate"}
        </button>
      </div>

      {showAutoGenerate ? (
        <div className="flex items-start gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg shrink-0">
            <HugeiconsIcon icon={Shield01Icon} size={16} />
          </div>
          <div className="text-sm text-blue-800 leading-relaxed">
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
              className="text-gray-400"
            />
          </div>
          <input
            type="text"
            required
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            placeholder="Enter temporary password"
          />
        </div>
      )}
    </div>
  );
}
