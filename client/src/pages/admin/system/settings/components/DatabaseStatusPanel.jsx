import { HugeiconsIcon } from "@hugeicons/react";
import { Database01Icon, Task01Icon } from "@hugeicons/core-free-icons";

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

export default function DatabaseStatusPanel({ healthData }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <HugeiconsIcon icon={Database01Icon} className="w-5 h-5 text-gray-500" />
        <h2 className="text-base font-bold text-gray-900">Database Status</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">Live connection diagnostics (refreshes every 15s).</p>
      <SettingRow
        label="Connection"
        value={
          healthData?.db_status === "connected"
            ? <span className="flex items-center gap-1.5 text-emerald-700 font-bold"><HugeiconsIcon icon={Task01Icon} className="w-4 h-4" /> Connected</span>
            : <span className="text-red-700 font-bold">Disconnected</span>
        }
        description="PostgreSQL connection pool"
      />
      <SettingRow label="Query Latency" value={healthData?.db_latency_ms != null ? `${healthData.db_latency_ms} ms` : "—"} description="Round-trip time for a simple SELECT 1" mono />
      <SettingRow label="Server Uptime" value={healthData?.uptime_seconds != null ? `${Math.floor(healthData.uptime_seconds / 3600)}h ${Math.floor((healthData.uptime_seconds % 3600) / 60)}m` : "—"} description="Time since last server restart" mono />
      <SettingRow label="Memory (RSS)" value={healthData?.memory_usage_mb != null ? `${healthData.memory_usage_mb} MB` : "—"} description="Resident set size" mono />
    </div>
  );
}
