import React from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  Database01Icon,
  Task01Icon,
  Shield01Icon,
  Note01Icon,
  Settings01Icon,
  FolderAddIcon,
} from "@hugeicons/core-free-icons";

function StatCard({ icon, label, value, sub, color = "gray", loading }) {
  const colorMap = {
    gray: "bg-gray-50 text-gray-700 border-gray-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorMap[color]}`}>
        <HugeiconsIcon icon={icon} className="w-5 h-5" />
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-16 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-3xl font-extrabold text-gray-900 tabular-nums">
            {Number(value ?? 0).toLocaleString()}
          </p>
          <div>
            <p className="text-sm font-semibold text-gray-700">{label}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
        </>
      )}
    </div>
  );
}

function HealthRow({ label, value, pill, pillColor }) {
  const pillColors = {
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        {pill && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pillColors[pillColor || "gray"]}`}>
            {pill}
          </span>
        )}
        {value && <span className="text-sm font-semibold text-gray-800 font-mono">{value}</span>}
      </div>
    </div>
  );
}

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
  });

  const s = statsData || {};

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">
          Platform Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard icon={UserGroupIcon} label="Total Users" value={s.total_users} sub={`${s.active_users ?? "—"} active`} color="blue" loading={statsLoading} />
          <StatCard icon={Shield01Icon} label="Banned Accounts" value={s.banned_users} sub="Platform-wide bans" color="red" loading={statsLoading} />
          <StatCard icon={FolderAddIcon} label="Total Modules" value={s.total_modules} sub="Published content" color="purple" loading={statsLoading} />
          <StatCard icon={Note01Icon} label="Enrollments" value={s.total_enrollments} sub="All-time" color="amber" loading={statsLoading} />
          <StatCard icon={Task01Icon} label="Completions" value={s.total_completions} sub="Finished modules" color="green" loading={statsLoading} />
          <StatCard icon={Task01Icon} label="Certificates" value={s.total_certificates} sub="Issued to date" color="blue" loading={statsLoading} />
          <StatCard icon={Database01Icon} label="Archived Users" value={s.archived_users} sub="Soft-deleted accounts" color="gray" loading={statsLoading} />
          <StatCard icon={Note01Icon} label="Audit Log Entries" value={s.total_log_entries} sub="All-time activity" color="gray" loading={statsLoading} />
        </div>
      </div>

      {/* Infrastructure Health */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <HugeiconsIcon icon={Settings01Icon} className="w-5 h-5 text-gray-500" />
            <h2 className="text-base font-bold text-gray-900">Infrastructure Health</h2>
          </div>
          {healthLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-9 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <HealthRow
                label="Database Connection"
                pill={healthData?.db_status === "connected" ? "Connected" : "Disconnected"}
                pillColor={healthData?.db_status === "connected" ? "green" : "red"}
                value={healthData?.db_latency_ms != null ? `${healthData.db_latency_ms}ms latency` : "—"}
              />
              <HealthRow
                label="Server Uptime"
                value={healthData?.uptime_seconds != null ? formatUptime(healthData.uptime_seconds) : "—"}
              />
              <HealthRow
                label="Memory Usage"
                value={healthData?.memory_usage_mb != null ? `${healthData.memory_usage_mb} MB` : "—"}
              />
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <HugeiconsIcon icon={Database01Icon} className="w-5 h-5 text-gray-500" />
            <h2 className="text-base font-bold text-gray-900">Runtime Environment</h2>
          </div>
          <HealthRow
            label="Environment"
            pill={settingsData?.node_env || "development"}
            pillColor={settingsData?.node_env === "production" ? "green" : "amber"}
          />
          <HealthRow label="Node.js Version" value={settingsData?.node_version || "—"} />
          <HealthRow label="Platform" value={settingsData?.platform || "—"} />
          <HealthRow
            label="Maintenance Mode"
            pill={settingsData?.maintenance_mode === "true" ? "Active" : "Off"}
            pillColor={settingsData?.maintenance_mode === "true" ? "red" : "green"}
          />
        </div>
      </div>
    </div>
  );
}
