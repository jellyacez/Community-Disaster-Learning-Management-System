import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from "@hugeicons/core-free-icons";

import PlatformOverviewGrid from "./components/PlatformOverviewGrid";
import HealthRow from "./components/HealthRow";
import SystemAlertBanner from "./components/SystemAlertBanner";
import SystemCharts from "./components/SystemCharts";
import QuickActionsPanel from "./components/QuickActionsPanel";

import RecentActivityFeed from "./components/RecentActivityFeed";

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${seconds % 60}s`;
}

export default function SystemOverview() {
  useDocumentTitle("System Overview | Admin Console");

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["systemStats"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/stats");
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["systemHealth"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/health");
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const { data: settingsData } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/settings");
      return res.data.data;
    },
    // Keep settings data fresh every 60s
    refetchInterval: 60000,
  });

  const s = statsData || {};

  return (
    <div className="space-y-6">
      <SystemAlertBanner healthData={healthData} />

      <PlatformOverviewGrid stats={s} loading={statsLoading} />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Side: Charts & Logs */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <SystemCharts stats={s} />
          <RecentActivityFeed />
        </div>

        {/* Right Side: Actions and Health */}
        <div className="lg:col-span-1 space-y-6">
          <QuickActionsPanel settingsData={settingsData} />

          <div className="bg-white rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-transparent p-6">
            <div className="flex items-center gap-2 mb-4">
              <HugeiconsIcon
                icon={Settings01Icon}
                className="w-5 h-5 text-gray-500"
              />
              <h2 className="text-base font-bold text-gray-900">
                Infrastructure Health
              </h2>
            </div>
            {healthLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-9 bg-gray-50 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <>
                <HealthRow
                  label="Database"
                  pill={
                    healthData?.db_status === "connected"
                      ? "Connected"
                      : "Disconnected"
                  }
                  pillColor={
                    healthData?.db_status === "connected" ? "green" : "red"
                  }
                  value={
                    healthData?.db_latency_ms != null
                      ? `${healthData.db_latency_ms}ms`
                      : "—"
                  }
                />
                <HealthRow
                  label="Server Uptime"
                  value={
                    healthData?.uptime_seconds != null
                      ? formatUptime(healthData.uptime_seconds)
                      : "—"
                  }
                />
                <HealthRow
                  label="Memory Usage"
                  progress={
                    healthData?.memory_usage_mb != null
                      ? (healthData.memory_usage_mb / 512) * 100
                      : 0
                  }
                  value={
                    healthData?.memory_usage_mb != null
                      ? `${healthData.memory_usage_mb} MB`
                      : "—"
                  }
                />
                <HealthRow
                  label="Disk Storage"
                  progress={
                    healthData?.disk_usage_percent != null
                      ? healthData.disk_usage_percent
                      : 0
                  }
                  value={
                    healthData?.disk_usage_percent != null
                      ? `${healthData.disk_usage_percent}%`
                      : "—"
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
