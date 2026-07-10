import { HugeiconsIcon } from "@hugeicons/react";
import { Note01Icon, Folder01Icon } from "@hugeicons/core-free-icons";

const ROLE_COLORS = {
  system_admin: "bg-purple-100 text-purple-800",
  mdrrmo_admin: "bg-blue-100 text-blue-800",
  barangay_admin: "bg-teal-100 text-teal-800",
  resident: "bg-gray-100 text-gray-600",
};

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50">
      {[1, 2, 3, 4].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function ActivityLogTable({ logs, isLoading, meta, setPage }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold w-48 text-sm">Timestamp</th>
              <th className="px-6 py-4 font-semibold w-64 text-sm">User</th>
              <th className="px-6 py-4 font-semibold w-40 text-sm">Role</th>
              <th className="px-6 py-4 font-semibold text-sm">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              [1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SkeletonRow key={i} />)
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-24 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                      <HugeiconsIcon icon={Folder01Icon} className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">No log entries found</h3>
                    <p className="text-xs text-gray-500 max-w-sm text-center">
                      System events, admin actions, and authentication updates will be recorded here dynamically.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.act_id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-gray-500 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={Note01Icon} className="w-4 h-4 text-gray-300 shrink-0" />
                      <div>
                        <p className="font-medium text-gray-700">{new Date(log.act_date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{new Date(log.act_date).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 uppercase shrink-0 ring-2 ring-white shadow-sm">
                        {log.user_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{log.user_name || "Unknown"}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{log.user_id?.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${ROLE_COLORS[log.user_role] || "bg-gray-100 text-gray-600"}`}>
                      {log.user_role || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700 leading-snug">
                    {log.act_log}
                  </td>
                </tr>
              ))
            )}
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={meta.page === meta.totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
