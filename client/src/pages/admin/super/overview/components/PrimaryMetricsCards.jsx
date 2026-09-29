import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserMultiple02Icon,
  Building03Icon,
  Alert02Icon,
  GraduationCapIcon,
} from "@hugeicons/core-free-icons";

function AnimatedNumber({ value }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const end = Number(value) || 0;
    if (end === 0) {
      setCurrent(0);
      return;
    }
    let start = 0;
    const duration = 1600; // Increased from 650ms to 1600ms for a slower count roll
    const stepTime = 25;
    const increment = end / (duration / stepTime);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCurrent(end);
        clearInterval(timer);
      } else {
        setCurrent(Math.ceil(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span className="stat-number-animate">{current}</span>;
}

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
      accent: "blue",
      badge: "Municipal Reach",
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
      accent: "emerald",
      badge: "Certified",
    },
    {
      title: "Active Alerts",
      value: stats?.activeAlerts ?? stats?.active_alerts ?? 0,
      description: (stats?.activeAlerts ?? stats?.active_alerts ?? 0) > 0 ? "Urgent notices active" : "MDRRMO broadcast feed clear",
      icon: Alert02Icon,
      accent: "amber",
      badge: "Broadcast",
    },
    {
      title: "Barangays Active",
      value: stats?.totalBarangays ?? stats?.total_barangays ?? totalBarangaysCount,
      description: "Municipality of Bacolor",
      icon: Building03Icon,
      accent: "red",
      badge: "100% Deployed",
    },
  ];

  const palette = {
    blue: {
      bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20",
      badge: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/60",
      border: "hover:border-blue-300 dark:hover:border-blue-800",
    },
    emerald: {
      bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20",
      badge: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/60",
      border: "hover:border-emerald-300 dark:hover:border-emerald-800",
    },
    amber: {
      bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20",
      badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/60",
      border: "hover:border-amber-300 dark:hover:border-amber-800",
    },
    red: {
      bg: "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20",
      badge: "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-900/60",
      border: "hover:border-red-300 dark:hover:border-red-800",
    },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const theme = palette[c.accent];
        return (
          <div
            key={i}
            className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_24px_-4px_rgba(0,0,0,0.08)] ${theme.border} transition-all duration-300 flex flex-col justify-between group`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badge}`}>
                  {c.badge}
                </span>
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mt-3">
                  {c.title}
                </p>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-1 tracking-tight">
                  {loading ? (
                    <span className="inline-block w-12 h-8 bg-gray-200 dark:bg-slate-800 animate-pulse rounded-lg" />
                  ) : (
                    <AnimatedNumber value={c.value} />
                  )}
                </h3>
              </div>

              <div className={`p-3.5 rounded-2xl ${theme.bg} group-hover:scale-110 transition-transform duration-200`}>
                <HugeiconsIcon icon={c.icon} className="w-6 h-6" />
              </div>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-4 pt-3 border-t border-gray-100 dark:border-slate-800/80">
              {c.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}