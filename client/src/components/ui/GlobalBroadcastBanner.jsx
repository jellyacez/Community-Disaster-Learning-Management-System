import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, Notification02Icon } from "@hugeicons/core-free-icons";
import apiClient from "../../lib/apiClient";

export default function GlobalBroadcastBanner() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["globalBroadcast"],
    queryFn: async () => {
      const res = await apiClient.get("/public/broadcast");
      return res.data;
    },
    refetchInterval: 60000, // Check every minute
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
      bg: "bg-amber-50",
      text: "text-amber-900",
      border: "border-amber-200",
      icon: "text-amber-600",
      pillBg: "bg-amber-200",
      pillText: "text-amber-900"
    },
    critical: {
      bg: "bg-red-600",
      text: "text-white",
      border: "border-red-700",
      icon: "text-white",
      pillBg: "bg-red-800",
      pillText: "text-white"
    },
    info: {
      bg: "bg-blue-600",
      text: "text-white",
      border: "border-blue-700",
      icon: "text-blue-100",
      pillBg: "bg-blue-800",
      pillText: "text-blue-100"
    }
  };

  const theme = styles[severity] || styles.warning;

  return (
    <div className={`w-full px-4 py-3 flex items-center justify-center shadow-sm relative z-50 border-b ${theme.bg} ${theme.text} ${theme.border}`}>
      <div className="flex items-center gap-3 max-w-7xl mx-auto px-4">
        <HugeiconsIcon icon={Notification02Icon} className={`w-5 h-5 flex-shrink-0 animate-pulse ${theme.icon}`} />
        <p className="text-sm font-bold text-center">
          <span className={`uppercase tracking-wider mr-3 font-mono text-[10px] px-2 py-0.5 rounded ${theme.pillBg} ${theme.pillText}`}>
            System Broadcast
          </span>
          <span>{data.message}</span>
        </p>
      </div>
    </div>
  );
}
