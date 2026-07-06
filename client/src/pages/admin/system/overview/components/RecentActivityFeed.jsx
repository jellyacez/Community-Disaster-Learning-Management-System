import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { Time02Icon, UserIcon, Shield01Icon, Settings01Icon, Alert01Icon, RefreshIcon } from "@hugeicons/core-free-icons";

export default function RecentActivityFeed() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["recentLogs"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/logs?limit=5&page=1");
      return res.data.data;
    },
    refetchInterval: 15000, // Poll every 15s as suggested
  });

  const getLogIcon = (logText) => {
    const text = logText?.toLowerCase() || "";
    if (text.includes("login") || text.includes("user")) return <UserIcon className="w-4 h-4 text-blue-500" />;
    if (text.includes("ban") || text.includes("role") || text.includes("security")) return <Shield01Icon className="w-4 h-4 text-red-500" />;
    if (text.includes("setting") || text.includes("maintenance")) return <Settings01Icon className="w-4 h-4 text-gray-500" />;
    return <Alert01Icon className="w-4 h-4 text-amber-500" />;
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
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 bg-gray-100 rounded w-3/4 animate-pulse" />
                  <div className="h-2.5 bg-gray-50 rounded w-1/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-sm text-gray-400">
            <HugeiconsIcon icon={Shield01Icon} className="w-8 h-8 text-gray-200 mb-2" />
            <p>No recent security events.</p>
          </div>
        ) : (
          <div className="space-y-5 relative before:absolute before:inset-y-0 before:left-4 before:w-px before:bg-gray-100">
            {data.map((log) => (
              <div key={log.act_id} className="flex gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0 z-10">
                  {getLogIcon(log.act_log)}
                </div>
                <div className="flex-1 min-w-0 pt-1.5">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {log.act_log}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-semibold text-gray-500 truncate max-w-[120px]">
                      {log.user_name || "System"}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {new Date(log.act_date).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
