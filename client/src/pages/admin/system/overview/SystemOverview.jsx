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
  Clock01Icon,
  Certificate01Icon,
} from "@hugeicons/core-free-icons";

import StatCard from "./components/StatCard";
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

      {/* Stats Grid */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">
          Platform Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard 
            icon={UserGroupIcon} 
            label="Total Users" 
            value={s.total_users} 
            href="/admin/system/users"
            trendText="+12% Active"
            sub={
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {s.online_users > 100 ? `${Math.round((s.online_users / (s.total_users || 1)) * 100)}% online` : `${s.online_users ?? 0} online now`}
              </span>
            } 
            color="blue" 
            loading={statsLoading} 
          />
          <StatCard icon={Shield01Icon} label="Banned Accounts" value={s.banned_users} href="/admin/system/users" sub="Platform-wide bans" color="red" loading={statsLoading} />
          <StatCard icon={FolderAddIcon} label="Total Modules" value={s.total_modules} sub="Published content" trendText="Stable" color="purple" loading={statsLoading} />
          <StatCard icon={Note01Icon} label="Enrollments" value={s.total_enrollments} sub="All-time" trendText="Growing" color="amber" loading={statsLoading} />
          <StatCard icon={Certificate01Icon} label="Certificates" value={s.total_certificates} sub="Issued to users" trendText="+5 This Week" color="green" loading={statsLoading} />
          <StatCard 
            icon={Clock01Icon} 
            label="Active Sessions" 
            value={s.online_users || 0} 
            sub="Current system load" 
            trendText={s.online_users > 50 ? "High Load" : "Normal Load"} 
            color={s.online_users > 50 ? "red" : "green"} 
            loading={statsLoading} 
          />
          
          <StatCard icon={Database01Icon} label="Archived Users" value={s.archived_users} sub="Soft-deleted accounts" color="gray" loading={statsLoading} />
          <StatCard icon={Settings01Icon} label="Audit Logs" value={s.total_log_entries} href="/admin/system/logs" sub="Recent security events" trendText="Live" color="gray" loading={statsLoading} />
        </div>
      </div>

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
              <HugeiconsIcon icon={Settings01Icon} className="w-5 h-5 text-gray-500" />
              <h2 className="text-base font-bold text-gray-900">Infrastructure Health</h2>
            </div>
            {healthLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-9 bg-gray-50 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <HealthRow
                  label="Database"
                  pill={healthData?.db_status === "connected" ? "Connected" : "Disconnected"}
                  pillColor={healthData?.db_status === "connected" ? "green" : "red"}
                  value={healthData?.db_latency_ms != null ? `${healthData.db_latency_ms}ms` : "—"}
                />
                <HealthRow
                  label="Server Uptime"
                  value={healthData?.uptime_seconds != null ? formatUptime(healthData.uptime_seconds) : "—"}
                />
                <HealthRow
                  label="Memory Usage"
                  progress={healthData?.memory_usage_mb != null ? (healthData.memory_usage_mb / 512) * 100 : 0}
                  value={healthData?.memory_usage_mb != null ? `${healthData.memory_usage_mb} MB` : "—"}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
