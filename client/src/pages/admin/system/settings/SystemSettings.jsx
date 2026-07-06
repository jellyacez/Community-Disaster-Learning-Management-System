import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";
import toast from "react-hot-toast";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Settings01Icon,
  Database01Icon,
  Notification01Icon,
  Task01Icon,
} from "@hugeicons/core-free-icons";

function SettingRow({ label, value, description, mono = false }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-gray-50 last:border-0 gap-1">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <span className={`text-sm ${mono ? "font-mono text-gray-600" : "font-semibold text-gray-700"} sm:text-right`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

export default function SystemSettings() {
  useDocumentTitle("System Settings | Admin Console");
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/settings");
      return res.data.data;
    },
  });

  const { data: healthData } = useQuery({
    queryKey: ["systemHealth"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/health");
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const [isToggling, setIsToggling] = useState(false);
  const maintenanceActive = settingsData?.maintenance_mode === "true";

  const toggleMaintenance = useMutation({
    mutationFn: async (enabled) => {
      return apiClient.patch("/admin/settings/maintenance", { enabled });
    },
    onMutate: () => setIsToggling(true),
    onSettled: () => setIsToggling(false),
    onSuccess: (_, enabled) => {
      toast.success(enabled ? "Maintenance mode enabled. The platform is now paused for residents." : "Maintenance mode disabled. Platform is live.");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: () => {
      toast.error("Failed to toggle maintenance mode.");
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Maintenance Mode — Actionable */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${maintenanceActive ? "border-red-200 bg-red-50" : "border-gray-100 bg-white"}`}>
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${maintenanceActive ? "bg-red-100" : "bg-gray-100"}`}>
                <HugeiconsIcon icon={Settings01Icon} className={`w-5 h-5 ${maintenanceActive ? "text-red-700" : "text-gray-600"}`} />
              </div>
              <div>
                <h3 className={`text-base font-bold ${maintenanceActive ? "text-red-900" : "text-gray-900"}`}>
                  Maintenance Mode
                </h3>
                <p className={`text-sm mt-1 max-w-md ${maintenanceActive ? "text-red-700" : "text-gray-500"}`}>
                  {maintenanceActive
                    ? "The platform is currently under maintenance. All resident and module routes return 503. Admin and auth routes remain accessible."
                    : "When enabled, all non-admin API routes return a 503 response. Use during database migrations or critical infrastructure updates."}
                </p>
              </div>
            </div>

            {/* Toggle */}
            <button
              onClick={() => toggleMaintenance.mutate(!maintenanceActive)}
              disabled={isLoading || isToggling}
              className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${maintenanceActive ? "bg-red-600 focus:ring-red-600" : "bg-gray-200 focus:ring-gray-900"}`}
              aria-label="Toggle maintenance mode"
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${maintenanceActive ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>

          {maintenanceActive && (
            <div className="mt-4 flex items-start gap-2 bg-red-100/60 rounded-xl p-3">
              <HugeiconsIcon icon={Notification01Icon} className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-800">
                All residents will see a maintenance page. Disable maintenance mode when your updates are complete.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* System Branding */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <HugeiconsIcon icon={Settings01Icon} className="w-5 h-5 text-gray-500" />
          <h3 className="text-base font-bold text-gray-900">System Branding</h3>
        </div>
        <p className="text-xs text-gray-500 mb-6 max-w-lg">Customize the platform's white-label identity. Upload a logo and set the display name.</p>
        
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const system_name = formData.get("system_name");
            const file = formData.get("system_logo");
            
            let system_logo = undefined;
            
            if (file && file.size > 0) {
              // Convert to Base64 using FileReader (Panelist Feedback)
              system_logo = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
            }

            try {
              toast.loading("Updating branding...", { id: "branding" });
              await apiClient.patch("/admin/settings/branding", { system_name, system_logo });
              toast.success("Branding updated successfully", { id: "branding" });
              queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
            } catch (err) {
              toast.error("Failed to update branding", { id: "branding" });
            }
          }}
          className="space-y-4"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">System Name</label>
              <input 
                type="text" 
                name="system_name" 
                defaultValue={settingsData?.system_name || "Community-Disaster-Learning-Management-System"} 
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Platform Logo</label>
              <input 
                type="file" 
                name="system_logo" 
                accept="image/*"
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
              />
            </div>
          </div>
          {settingsData?.system_logo && (
             <div className="mt-2">
                <p className="text-xs text-gray-400 mb-2">Current Logo:</p>
                <img src={settingsData.system_logo} alt="System Logo" className="h-12 object-contain rounded border border-gray-100 p-1 bg-gray-50" />
             </div>
          )}
          <div className="pt-2">
             <button type="submit" className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-black transition-colors">
               Save Branding
             </button>
          </div>
        </form>
      </div>

      {/* Runtime Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <HugeiconsIcon icon={Settings01Icon} className="w-5 h-5 text-gray-500" />
          <h3 className="text-base font-bold text-gray-900">Runtime Environment</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">Read-only system information.</p>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />)}
          </div>
        ) : (
          <>
            <SettingRow label="Environment" value={settingsData?.node_env || "—"} description="NODE_ENV value" mono />
            <SettingRow label="Node.js Version" value={settingsData?.node_version || "—"} description="Server runtime version" mono />
            <SettingRow label="Platform" value={settingsData?.platform || "—"} description="Operating system" mono />
          </>
        )}
      </div>

      {/* Database Status */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <HugeiconsIcon icon={Database01Icon} className="w-5 h-5 text-gray-500" />
          <h3 className="text-base font-bold text-gray-900">Database Status</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">Live connection diagnostics (refreshes every 15s).</p>
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

    </div>
  );
}
