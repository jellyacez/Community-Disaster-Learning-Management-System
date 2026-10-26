import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification02Icon } from "@hugeicons/core-free-icons";
import apiClient from "../../lib/apiClient";

export default function GlobalBroadcastBanner() {
  const location = useLocation();
  const isResidentLayout = location.pathname.startsWith("/user") || location.pathname === "/userDashboard";

  const { data, isLoading, error } = useQuery({
    queryKey: ["globalBroadcast"],
    queryFn: async () => {
      const res = await apiClient.get("/public/broadcast");
      return res.data;
    },
    refetchInterval: 1000 * 60 * 5, // Check every *5* minutes
    staleTime: 30000,
    retry: false,
  });

  if (isLoading || error || !data?.active || !data?.message) {
    return null;
  }

  // Determine styling based on severity (default to warning)
  const severity = data.severity || "warning";
  
  const styles = {
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/60",
      text: "text-amber-900 dark:text-amber-200",
      border: "border-amber-200 dark:border-amber-900/60",
      icon: "text-amber-600 dark:text-amber-400",
      pillBg: "bg-amber-200 dark:bg-amber-900/80",
      pillText: "text-amber-900 dark:text-amber-100"
    },
    critical: {
      bg: "bg-red-600 dark:bg-red-700",
      text: "text-white",
      border: "border-red-700 dark:border-red-800",
      icon: "text-white",
      pillBg: "bg-red-800 dark:bg-red-900",
      pillText: "text-white"
    },
    info: {
      bg: "bg-blue-600 dark:bg-blue-700",
      text: "text-white",
      border: "border-blue-700 dark:border-blue-800",
      icon: "text-blue-100",
      pillBg: "bg-blue-800 dark:bg-blue-900",
      pillText: "text-blue-100"
    }
  };

  const theme = styles[severity] || styles.warning;

  return (
    <div
      role="region"
      aria-label="Global System Broadcast"
      className={`w-full px-4 py-2.5 flex items-center justify-center shadow-sm relative z-40 border-b transition-all duration-150 ${isResidentLayout ? "lg:pl-72" : ""} ${theme.bg} ${theme.text} ${theme.border}`}
    >
      <div className="flex items-center justify-center gap-2.5 max-w-6xl mx-auto w-full min-w-0">
        <HugeiconsIcon icon={Notification02Icon} className={`w-4 h-4 shrink-0 animate-pulse ${theme.icon}`} />
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 min-w-0 text-center">
          <span className={`inline-flex shrink-0 items-center uppercase tracking-wider font-mono text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${theme.pillBg} ${theme.pillText}`}>
            System Broadcast
          </span>
          <p className="text-xs sm:text-sm font-semibold break-words min-w-0 leading-snug text-center">
            {data.message}
          </p>
        </div>
      </div>
    </div>
  );
}
