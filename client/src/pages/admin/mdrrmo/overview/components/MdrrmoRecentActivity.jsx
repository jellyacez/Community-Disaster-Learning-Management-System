import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { Time02Icon, UserIcon, RefreshIcon, Note01Icon, Certificate01Icon } from "@hugeicons/core-free-icons";
import { SkeletonFeedItem } from "../../../../../components/ui/Skeleton";

export default function MdrrmoRecentActivity() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["mdrrmoRecentLogs"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/mdrrmo/recent-activity");
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const getLogIcon = (logText) => {
    const text = logText?.toLowerCase() || "";
    if (text.includes("cert") || text.includes("issue")) return <HugeiconsIcon icon={Certificate01Icon} className="w-4 h-4 text-emerald-500" />;
    if (text.includes("module") || text.includes("content")) return <HugeiconsIcon icon={Note01Icon} className="w-4 h-4 text-purple-500" />;
    return <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-transparent shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <HugeiconsIcon icon={Time02Icon} className="w-5 h-5 text-gray-400" />
          Recent System Events
        </h2>
        <button 
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1"
        >
          <HugeiconsIcon icon={RefreshIcon} className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <SkeletonFeedItem key={i} />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-sm text-gray-400">
            <HugeiconsIcon icon={Time02Icon} className="w-8 h-8 text-gray-200 mb-2" />
            <p>No recent events.</p>
          </div>
        ) : (
          <div className="space-y-5 relative before:absolute before:inset-y-0 before:left-4 before:w-px before:bg-gray-100">
            {data.slice(0, 5).map((log) => {
              const text = (log.log || "").toLowerCase();
              let iconNode = <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-gray-500" />;
              if (text.includes("cert") || text.includes("issue")) iconNode = <HugeiconsIcon icon={Certificate01Icon} className="w-4 h-4 text-amber-500" />;
              else if (text.includes("module") || text.includes("content")) iconNode = <HugeiconsIcon icon={Note01Icon} className="w-4 h-4 text-purple-500" />;
              else if (text.includes("logged in") || text.includes("login")) iconNode = <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-emerald-500" />;
              else if (text.includes("logged out") || text.includes("logout")) iconNode = <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-gray-400" />;

              // Parse timestamp to relative
              const date = new Date(log.timestamp);
              const diffMs = new Date() - date;
              const diffMins = Math.floor(diffMs / 60000);
              const diffHrs = Math.floor(diffMins / 60);
              const diffDays = Math.floor(diffHrs / 24);
              
              let timeStr = "just now";
              if (diffMins > 0 && diffMins < 60) timeStr = `${diffMins} minutes ago`;
              else if (diffHrs > 0 && diffHrs < 24) timeStr = `${diffHrs} hours ago`;
              else if (diffDays > 0) timeStr = `${diffDays} days ago`;

              return (
              <div key={log.id} className="flex gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0 z-10">
                  {iconNode}
                </div>
                <div className="flex-1 min-w-0 pt-1.5">
                  <p className="text-sm text-gray-900 truncate">
                    <span className="font-bold">{log.user_name}</span> {log.log.replace(/^User .*? /, '').replace(log.user_name, '').trim()}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-semibold text-gray-500 truncate max-w-[120px]">
                      {log.source}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {timeStr}
                    </span>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}
