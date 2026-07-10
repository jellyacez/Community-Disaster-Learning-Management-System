import StatCard from "./StatCard";
import {
  UserGroupIcon,
  Database01Icon,
  Shield01Icon,
  Note01Icon,
  Settings01Icon,
  FolderAddIcon,
  Clock01Icon,
  Certificate01Icon,
} from "@hugeicons/core-free-icons";

export default function PlatformOverviewGrid({ stats, loading }) {
  const s = stats || {};
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">
        Platform Overview
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          icon={UserGroupIcon}
          label="Total Users"
          value={s.total_users}
          href="/admin/system/users"
          sub={
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {s.online_users > 100
                ? `${Math.round((s.online_users / (s.total_users || 1)) * 100)}% online`
                : `${s.online_users ?? 0} online now`}
            </span>
          }
          color="blue"
          loading={loading}
        />
        <StatCard
          icon={Shield01Icon}
          label="Banned Accounts"
          value={s.banned_users}
          href="/admin/system/users"
          sub="Platform-wide bans"
          zeroText="All clear"
          color="red"
          loading={loading}
        />
        <StatCard
          icon={FolderAddIcon}
          label="Total Modules"
          value={s.total_modules}
          sub="Published content"
          color="purple"
          loading={loading}
        />
        <StatCard
          icon={Note01Icon}
          label="Enrollments"
          value={s.total_enrollments}
          sub="All-time"
          color="amber"
          loading={loading}
        />
        <StatCard
          icon={Certificate01Icon}
          label="Certificates"
          value={s.total_certificates}
          sub="Issued to users"
          color="green"
          loading={loading}
        />
        <StatCard
          icon={Clock01Icon}
          label="Active Sessions"
          value={s.online_users || 0}
          sub="Current system load"
          trendText={s.online_users > 50 ? "High Load" : "Normal Load"}
          color={s.online_users > 50 ? "red" : "green"}
          loading={loading}
        />

        <StatCard
          icon={Database01Icon}
          label="Archived Users"
          value={s.archived_users}
          sub="Soft-deleted accounts"
          color="gray"
          loading={loading}
        />
        <StatCard
          icon={Settings01Icon}
          label="Audit Logs"
          value={s.total_log_entries}
          href="/admin/system/logs"
          sub="Recent security events"
          trendText="Live"
          color="gray"
          loading={loading}
        />
      </div>
    </div>
  );
}
