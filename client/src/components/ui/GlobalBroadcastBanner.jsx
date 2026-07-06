import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, Notification02Icon } from "@hugeicons/core-free-icons";

export default function GlobalBroadcastBanner() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["globalBroadcast"],
    queryFn: async () => {
      const res = await fetch("/api/public/broadcast");
      if (!res.ok) throw new Error("Failed to fetch broadcast");
      return res.json();
    },
    refetchInterval: 60000, // Check every minute
    staleTime: 30000,
    retry: false,
  });

  if (isLoading || error || !data?.active || !data?.message) {
    return null;
  }

  return (
    <div className="w-full bg-red-600 text-white px-4 py-3 flex items-center justify-center shadow-md relative z-50">
      <div className="flex items-center gap-3 max-w-7xl mx-auto px-4">
        <HugeiconsIcon icon={Notification02Icon} className="w-5 h-5 flex-shrink-0 animate-pulse" />
        <p className="text-sm font-bold text-center">
          <span className="uppercase tracking-wider mr-2 font-mono text-xs opacity-90 bg-red-800 px-2 py-0.5 rounded">System Broadcast</span>
          {data.message}
        </p>
      </div>
    </div>
  );
}
