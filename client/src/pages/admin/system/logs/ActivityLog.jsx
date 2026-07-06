import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Note01Icon } from "@hugeicons/core-free-icons";

const ROLE_COLORS = {
  system_admin: "bg-purple-100 text-purple-800",
  mdrrmo_admin: "bg-blue-100 text-blue-800",
  barangay_admin: "bg-teal-100 text-teal-800",
  resident: "bg-gray-100 text-gray-600",
};

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50">
      {[1, 2, 3, 4].map(i => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function ActivityLog() {
  useDocumentTitle("Activity Log | Admin Console");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["activityLog", page, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 25 });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await apiClient.get(`/admin/activity-log?${params}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const logs = data?.data || [];
  const meta = data?.meta || { totalPages: 1, page: 1, total: 0 };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by user name or action..."
            aria-label="Search logs"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
        <span className="self-center text-xs text-gray-500 font-mono whitespace-nowrap">
          {meta.total.toLocaleString()} total entries
        </span>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold w-40">Timestamp</th>
                <th className="px-4 py-3 font-semibold w-48">User</th>
                <th className="px-4 py-3 font-semibold w-28">Role</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? [1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonRow key={i} />)
                : logs.length === 0
                ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-gray-500 text-sm">
                      No log entries found.
                    </td>
                  </tr>
                )
                : logs.map(log => (
                  <tr key={log.act_id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <HugeiconsIcon icon={Note01Icon} className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <div>
                          <p>{new Date(log.act_date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</p>
                          <p className="text-gray-500">{new Date(log.act_date).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 uppercase flex-shrink-0">
                          {log.user_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{log.user_name || "Unknown"}</p>
                          <p className="text-xs text-gray-500 font-mono">{log.user_id?.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_COLORS[log.user_role] || "bg-gray-100 text-gray-600"}`}>
                        {log.user_role || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 leading-snug">
                      {log.act_log}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={meta.page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page === meta.totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
