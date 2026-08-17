import React from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";

const fetchLogs = async () => {
  const res = await apiClient.get("/admin/barangay/activity-log");
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
};

export default function SystemLogs() {
  const { data: webLogs = [], isLoading, isError } = useQuery({
    queryKey: ["barangayActivityLogs"],
    queryFn: fetchLogs,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 animate-in fade-in duration-150">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100 pb-2 font-mono">
          Unified Activity Log System Database
        </h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-6 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
        <p className="font-bold">Error loading system logs.</p>
        <p className="text-sm">Please ensure the backend routes are connected.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 font-mono">
          Unified Activity Log System Database
        </h3>
        <span className="text-xs font-mono font-bold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-lg">
          {webLogs.length} Entries
        </span>
      </div>

      <div className="space-y-3">
        {webLogs.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-6">
            No audit logs available for this barangay.
          </p>
        ) : (
          webLogs.map((log) => (
            <div
              key={log.id || log.act_id}
              className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-gray-300 transition-colors"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {log.user_name || "System User"}
                  </span>
                  {log.user_email && (
                    <span className="text-xs text-gray-400">({log.user_email})</span>
                  )}
                </div>
                <span className="text-gray-600 text-xs font-mono">
                  {log.details || log.act_log || log.log || log.activity}
                </span>
              </div>

              <span className="font-mono text-[11px] text-gray-500 shrink-0 bg-white px-2.5 py-1 border border-gray-200 rounded-md">
                {log.created_at || log.act_date
                  ? new Date(log.created_at || log.act_date).toLocaleString()
                  : log.timestamp || "N/A"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}