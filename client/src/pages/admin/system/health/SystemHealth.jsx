import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon, Time02Icon, RefreshIcon, Database01Icon, Notification01Icon, Folder01Icon, Alert01Icon, Shield01Icon } from "@hugeicons/core-free-icons";

// We reuse these components from the Overview section to maintain design consistency
import StatCard from "../overview/components/StatCard";
import HealthRow from "../overview/components/HealthRow";

import RuntimeInfoPanel from "../settings/components/RuntimeInfoPanel";
import InfrastructureOperationsPanel from "./components/InfrastructureOperationsPanel";


export default function SystemHealth() {
  useDocumentTitle("System Health | Admin Console");

  const { data: settingsData, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/settings");
      return res.data.data;
    },
  });

  const { data: healthData, isLoading: isHealthLoading, isError } = useQuery({
    queryKey: ["systemHealth"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/health");
      return res.data.data;
    },
    refetchInterval: 5000, // Faster refresh to see the CPU "heartbeat"
  });

  // Calculate dynamic states
  const dbStatus = healthData?.db_status === "connected" ? "Healthy" : "Offline";
  
  const latency = healthData?.db_latency_ms;
  const latencyTrend = latency < 100 ? "Fast" : latency < 300 ? "Normal" : "Slow";

  const formatUptime = (seconds) => {
    if (!seconds) return "—";
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatMBtoGB = (mb) => {
    if (mb == null) return "—";
    return (mb / 1024).toFixed(1) + " GB";
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor runtime environment and infrastructure observability.
        </p>
      </div>

      {/* ZONE 1: The "Pulse" Row (StatCards) */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 mt-8">
          System Pulse
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            label="System Status" 
            value={dbStatus} 
            icon={Settings01Icon} 
            trendText={healthData?.db_status === "connected" ? "Operational" : "Check DB"}
            color={healthData?.db_status === "connected" ? "green" : "red"}
            isNumeric={false}
            loading={isHealthLoading}
          />
          <StatCard 
            label="Server Uptime" 
            value={formatUptime(healthData?.uptime_seconds)} 
            icon={Time02Icon} 
            trendText="Since last restart"
            color="blue"
            isNumeric={false}
            loading={isHealthLoading}
          />
          <StatCard 
            label="API Latency" 
            value={latency != null ? `${latency}ms` : "—"} 
            icon={RefreshIcon} 
            trendText={latencyTrend}
            color={latency < 100 ? "green" : latency < 300 ? "amber" : "red"}
            isNumeric={false}
            loading={isHealthLoading}
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 mt-8">
          Infrastructure Observability
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ZONE 2: The "Capacity" Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full">
              <h2 className="text-base font-bold text-gray-900 mb-2">Resource Capacity</h2>
              <p className="text-xs text-gray-500 mb-6">Real-time operating system metrics (refreshes every 5s).</p>
              
              <div className="space-y-1">
                <HealthRow 
                  label="Memory (RAM) Usage" 
                  value={healthData?.memory_usage_mb != null ? `${formatMBtoGB(healthData.memory_usage_mb)} / ${formatMBtoGB(healthData.memory_total_mb)}` : "—"} 
                  progress={healthData?.memory_usage_percent || 0}
                />
                <HealthRow 
                  label="CPU Load" 
                  value={healthData?.cpu_load_percent != null ? `${healthData.cpu_load_percent}%` : "—"} 
                  progress={healthData?.cpu_load_percent || 0}
                />
                <HealthRow 
                  label="Storage Space (Mocked)" 
                  value={healthData?.disk_usage_percent != null ? `${healthData.disk_usage_percent}%` : "—"} 
                  progress={healthData?.disk_usage_percent || 0}
                />
              </div>
            </div>
          </div>

          {/* ZONE 3: The "Service Connectivity" List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full">
              <h2 className="text-base font-bold text-gray-900 mb-2">Service Connectivity</h2>
              <p className="text-xs text-gray-500 mb-6">External infrastructure dependencies.</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={Database01Icon} className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">PostgreSQL</span>
                  </div>
                  {healthData?.db_status === "connected" ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1"><HugeiconsIcon icon={Shield01Icon} className="w-3.5 h-3.5" /> Connected</span>
                  ) : (
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full flex items-center gap-1"><HugeiconsIcon icon={Alert01Icon} className="w-3.5 h-3.5" /> Error</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={Notification01Icon} className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">Email SMTP</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1"><HugeiconsIcon icon={Shield01Icon} className="w-3.5 h-3.5" /> Connected</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={Folder01Icon} className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">AWS S3</span>
                  </div>
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full flex items-center gap-1">Pending Setup</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 mt-8">
          Configuration & Maintenance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RuntimeInfoPanel settingsData={settingsData} isLoading={isSettingsLoading} />
          <InfrastructureOperationsPanel />
        </div>
      </div>

    </div>
  );
}
