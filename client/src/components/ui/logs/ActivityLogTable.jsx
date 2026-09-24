import { HugeiconsIcon } from "@hugeicons/react";
import { Note01Icon, Folder01Icon } from "@hugeicons/core-free-icons";
import RoleBadge from "./RoleBadge";
import { getActionColor } from "./logUtils";
import AdminTablePagination from "../pagination/AdminTablePagination";

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50 dark:border-slate-800/60">
      {[1, 2, 3, 4].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function ActivityLogTable({ logs, isLoading, meta, setPage, limit, setLimit, hideRoleColumn = false }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
      <div className="overflow-x-auto rounded-t-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold w-48 text-sm">Timestamp</th>
              <th className="px-6 py-4 font-semibold w-64 text-sm">User</th>
              {!hideRoleColumn && <th className="px-6 py-4 font-semibold w-40 text-sm">Role</th>}
              <th className="px-6 py-4 font-semibold text-sm">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60">
            {isLoading ? (
              [1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SkeletonRow key={i} />)
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={hideRoleColumn ? 3 : 4} className="py-24 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
                      <HugeiconsIcon icon={Folder01Icon} className="w-8 h-8 text-gray-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">No log entries found</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm text-center">
                      System events, admin actions, and authentication updates will be recorded here dynamically.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.act_id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-slate-400 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={Note01Icon} className="w-4 h-4 text-gray-300 dark:text-slate-600 shrink-0" />
                      <div>
                        <p className="font-medium text-gray-700 dark:text-slate-200">{new Date(log.act_date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</p>
                        <p className="text-gray-400 dark:text-slate-500 text-xs mt-0.5">{new Date(log.act_date).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-slate-300 uppercase shrink-0 ring-2 ring-white dark:ring-slate-900 shadow-sm">
                        {log.user_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{log.user_name || "Unknown"}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 font-mono mt-0.5" title={log.user_id}>{log.user_id?.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  {!hideRoleColumn && (
                    <td className="px-6 py-4">
                      <RoleBadge role={log.user_role} />
                    </td>
                  )}
                  <td className={`px-6 py-4 text-sm font-medium leading-snug ${getActionColor(log.act_log)}`}>
                    {log.act_log}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sticky Pagination */}
      <AdminTablePagination
        page={meta?.page || 1}
        totalPages={meta?.totalPages || 1}
        total={meta?.total || 0}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        limitOptions={[10, 25, 50, 100]}
        isLoading={isLoading}
        itemName="activity logs"
        sticky={true}
        className="rounded-b-2xl"
      />
    </div>
  );
}
