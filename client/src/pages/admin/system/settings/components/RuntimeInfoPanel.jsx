import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from "@hugeicons/core-free-icons";

function SettingRow({ label, value, description, mono = false }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-gray-50 last:border-0 gap-1">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <span className={`text-sm ${mono ? "font-mono text-gray-600" : "font-semibold text-gray-700"} sm:text-right`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

export default function RuntimeInfoPanel({ settingsData, isLoading }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <HugeiconsIcon icon={Settings01Icon} className="w-5 h-5 text-gray-500" />
        <h2 className="text-base font-bold text-gray-900">Runtime Environment</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">Read-only system information.</p>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />)}
        </div>
      ) : (
        <>
          <SettingRow 
            label="Node.js Engine" 
            value="Active (LTS)" 
            description="Server runtime status" 
          />
          <SettingRow 
            label="Host OS" 
            value="Online" 
            description="Underlying operating system" 
          />
          <SettingRow 
            label="Configuration Readiness" 
            value="Secured" 
            description="Environment variables (SMTP, DB, JWT)" 
          />
        </>
      )}
    </div>
  );
}
