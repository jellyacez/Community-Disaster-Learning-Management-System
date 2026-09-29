import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserMultiple02Icon,
  Building03Icon,
  Alert02Icon,
  GraduationCapIcon,
} from "@hugeicons/core-free-icons";

export default function PrimaryMetricsCards({ stats, loading, totalBarangaysCount }) {
  const cards = [
    {
      title: "Total Accounts",
      value:
        stats?.total_users ??
        stats?.totalUsers ??
        stats?.users ??
        stats?.total_accounts ??
        0,
      description: "Platform-wide registrations",
      icon: UserMultiple02Icon,
      accentColor: "blue",
      badgeText: "Municipal Users",
    },
    {
      title: "Trained Citizens",
      value:
        stats?.totalCertificates ??
        stats?.total_certificates ??
        stats?.certificates_issued ??
        0,
      description: "Completed DRRM certifications",
      icon: GraduationCapIcon,
      accentColor: "emerald",
      badgeText: "Certified",
    },
    {
      title: "Active Alerts",
      value: stats?.activeAlerts ?? stats?.active_alerts ?? 0,
      description: (stats?.activeAlerts ?? stats?.active_alerts ?? 0) > 0 ? "Urgent notices active" : "MDRRMO broadcast feed clear",
      icon: Alert02Icon,
      accentColor: "amber",
      badgeText: "Broadcast",
    },
    {
      title: "Barangays Active",
      value: stats?.totalBarangays ?? stats?.total_barangays ?? totalBarangaysCount,
      description: "Municipality of Bacolor",
      icon: Building03Icon,
      accentColor: "red",
      badgeText: "100% Deployed",
    },
  ];

  const colorStyles = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/50",
      text: "text-blue-600 dark:text-blue-400",
      badge: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/60",
      hover: "hover:border-blue-200 dark:hover:border-blue-800/60",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
      text: "text-emerald-600 dark:text-emerald-400",
      badge: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/60",
      hover: "hover:border-emerald-200 dark:hover:border-emerald-800/60",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/50",
      text: "text-amber-600 dark:text-amber-400",
      badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/60",
      hover: "hover:border-amber-200 dark:hover:border-amber-800/60",
    },
    red: {
      bg: "bg-red-50 dark:bg-red-950/50",
      text: "text-red-600 dark:text-red-400",
      badge: "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/60",
      hover: "hover:border-red-200 dark:hover:border-red-800/60",
    },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const style = colorStyles[c.accentColor];
        return (
          <div
            key={i}
            className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${style.hover} transition-all duration-200 flex flex-col justify-between group`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.badge}`}>
                  {c.badgeText}
                </span>
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mt-3">
                  {c.title}
                </p>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-1 tracking-tight">
                  {loading ? (
                    <span className="inline-block w-12 h-8 bg-gray-200 dark:bg-slate-800 animate-pulse rounded-lg" />
                  ) : (
                    c.value
                  )}
                </h3>
              </div>

              <div className={`p-3.5 rounded-2xl ${style.bg} ${style.text} group-hover:scale-105 transition-transform`}>
                <HugeiconsIcon icon={c.icon} className="w-6 h-6" />
              </div>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-4 pt-3 border-t border-gray-50 dark:border-slate-800/60 flex items-center justify-between">
              <span>{c.description}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}