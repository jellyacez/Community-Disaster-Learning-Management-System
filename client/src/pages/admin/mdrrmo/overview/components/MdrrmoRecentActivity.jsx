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

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-6 flex flex-col h-full min-h-[360px] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <HugeiconsIcon icon={Time02Icon} className="w-4 h-4 text-gray-400" />
          Recent System Events
        </h2>
        <button 
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <HugeiconsIcon icon={RefreshIcon} className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        {isLoading ? (
          <div className="space-y-3 py-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonFeedItem key={i} />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-sm text-gray-400 py-8">
            <HugeiconsIcon icon={Time02Icon} className="w-8 h-8 text-gray-200 mb-2" />
            <p>No recent events.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between py-1">
            {data.slice(0, 5).map((log) => {
              const text = (log.log || "").toLowerCase();
              let iconNode = <HugeiconsIcon icon={UserIcon} className="w-3.5 h-3.5 text-gray-500" />;
              if (text.includes("cert") || text.includes("issue")) iconNode = <HugeiconsIcon icon={Certificate01Icon} className="w-3.5 h-3.5 text-amber-500" />;
              else if (text.includes("module") || text.includes("content")) iconNode = <HugeiconsIcon icon={Note01Icon} className="w-3.5 h-3.5 text-purple-500" />;
              else if (text.includes("logged in") || text.includes("login")) iconNode = <HugeiconsIcon icon={UserIcon} className="w-3.5 h-3.5 text-emerald-500" />;
              else if (text.includes("logged out") || text.includes("logout")) iconNode = <HugeiconsIcon icon={UserIcon} className="w-3.5 h-3.5 text-gray-400" />;

              const date = new Date(log.timestamp);
              const diffMs = new Date() - date;
              const diffMins = Math.floor(diffMs / 60000);
              const diffHrs = Math.floor(diffMins / 60);
              const diffDays = Math.floor(diffHrs / 24);
              
              let timeStr = "just now";
              if (diffMins > 0 && diffMins < 60) timeStr = `${diffMins}m ago`;
              else if (diffHrs > 0 && diffHrs < 24) timeStr = `${diffHrs}h ago`;
              else if (diffDays > 0) timeStr = `${diffDays}d ago`;

              return (
                <div key={log.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    {iconNode}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 truncate" title={log.log}>
                      <span className="font-semibold text-gray-900">{log.user_name}</span> {log.log.replace(/^User .*? /, '').replace(log.user_name, '').trim()}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
                      <span className="font-medium text-gray-500 truncate max-w-[120px]">{log.source}</span>
                      <span>•</span>
                      <span>{timeStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
