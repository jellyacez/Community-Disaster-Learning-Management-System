import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Download04Icon,
  Shield01Icon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons";
import apiClient from "../../../../lib/apiClient";
import useDebounce from "../../../../hooks/useDebounce";
import AdminTablePagination from "../../../../components/ui/pagination/AdminTablePagination";

const ROLE_CONFIG = {
  super_admin: {
    label: "Super Admin",
    bg: "bg-amber-100 dark:bg-amber-950/60",
    text: "text-amber-800 dark:text-amber-300",
  },
  system_admin: {
    label: "System Admin",
    bg: "bg-red-100 dark:bg-red-950/60",
    text: "text-red-700 dark:text-red-300",
  },
  head_mdrrmo_admin: {
    label: "Head Admin",
    bg: "bg-purple-100 dark:bg-purple-950/60",
    text: "text-purple-700 dark:text-purple-300",
  },
  mdrrmo_admin: {
    label: "MDRRMO Admin",
    bg: "bg-blue-100 dark:bg-blue-950/60",
    text: "text-blue-700 dark:text-blue-300",
  },
  barangay_admin: {
    label: "Barangay Admin",
    bg: "bg-emerald-100 dark:bg-emerald-950/60",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  resident: {
    label: "Resident",
    bg: "bg-gray-100 dark:bg-slate-800",
    text: "text-gray-700 dark:text-slate-300",
  },
};

export default function GovernanceLog() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["governanceLogs", page, limit, debouncedSearch, roleFilter, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (roleFilter) params.append("role", roleFilter);
      if (actionFilter) params.append("action", actionFilter);

      const res = await apiClient.get(`/admin/super/activity-log?${params.toString()}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const logs = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1, page: 1, limit: 25 };

  const handleExport = async () => {
    try {
      const response = await apiClient.get("/admin/super/activity-log/export", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `governance_logs_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <HugeiconsIcon icon={Shield01Icon} className="w-7 h-7 text-amber-500" />
            Governance Logs
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Global oversight audit trail across all administrative tiers, security overrides, and user activity.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors shadow-2xs cursor-pointer self-start md:self-auto"
        >
          <HugeiconsIcon icon={Download04Icon} className="w-4 h-4 text-gray-500" />
          Export Audit CSV
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden">
        {/* Filters Header */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between bg-gray-50/50 dark:bg-slate-900/50">
          <div className="relative flex-1 max-w-md">
            <HugeiconsIcon
              icon={Search01Icon}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500"
            />
            <input
              type="text"
              placeholder="Search by user, email, or action..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="admins">All Admins</option>
              <option value="super_admin">Super Admin</option>
              <option value="system_admin">System Admin</option>
              <option value="head_mdrrmo_admin">Head Admin</option>
              <option value="mdrrmo_admin">MDRRMO Admin</option>
              <option value="barangay_admin">Barangay Admin</option>
              <option value="resident">Resident</option>
            </select>

            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
            >
              <option value="">All Actions</option>
              <option value="impersonate">Impersonations</option>
              <option value="auth">Auth & Logins</option>
              <option value="role">Role Updates</option>
              <option value="ban">Bans & Suspensions</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/70 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-gray-400 dark:text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-gray-400 dark:text-slate-500">
                    No activity found matching your criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const roleStyle = ROLE_CONFIG[log.user_role] || ROLE_CONFIG.resident;
                  const isImpersonation = log.act_log.toLowerCase().includes("impersonat");
                  const isLogin = log.act_log.toLowerCase().includes("logged in");
                  const isLogout = log.act_log.toLowerCase().includes("logged out");
                  const isDanger = log.act_log.toLowerCase().includes("deleted") || log.act_log.toLowerCase().includes("failed");

                  return (
                    <tr
                      key={log.act_id}
                      className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-slate-400 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <HugeiconsIcon icon={Calendar03Icon} className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <div>
                            <div>{new Date(log.act_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500">
                              {new Date(log.act_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                            {log.user_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-slate-100 leading-tight">
                              {log.user_name || "Unknown"}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-slate-500 font-mono mt-0.5 truncate max-w-[120px]">
                              {log.user_id ? `${log.user_id.slice(0, 8)}...` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${roleStyle.bg} ${roleStyle.text}`}>
                          {roleStyle.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`font-medium ${
                            isImpersonation
                              ? "text-amber-600 dark:text-amber-400 font-semibold"
                              : isDanger
                              ? "text-red-600 dark:text-red-400"
                              : isLogin || isLogout
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-gray-700 dark:text-slate-300"
                          }`}
                        >
                          {log.act_log}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-slate-800">
          <AdminTablePagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            isLoading={isFetching}
            itemName="audit records"
          />
        </div>
      </div>
    </div>
  );
}