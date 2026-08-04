import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import useDebounce from "../../../../hooks/useDebounce";
import toast from "react-hot-toast";

import ActivityLogFilters from "../../../../components/ui/logs/ActivityLogFilters";
import ActivityLogTable from "../../../../components/ui/logs/ActivityLogTable";

export default function ActivityLog() {
  useDocumentTitle("Activity & Monitoring Logs | Admin Console");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [roleFilter, setRoleFilter] = useState("non_resident");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Reset page on filter changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [roleFilter, actionFilter, limit]);

  const { data, isLoading } = useQuery({
    queryKey: [
      "mdrrmoActivityLog",
      page,
      limit,
      debouncedSearch,
      roleFilter,
      actionFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter) params.set("role", roleFilter);
      if (actionFilter) params.set("action", actionFilter);
      const res = await apiClient.get(`/admin/mdrrmo/activity-log?${params}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const logs = data?.data || [];
  const meta = data?.meta || { totalPages: 1, page: 1, total: 0 };

  const handleExportLogs = () => {
    toast.promise(
      apiClient
        .get("/admin/mdrrmo/activity-log/export", { responseType: "blob" })
        .then((res) => {
          const blob = new Blob([res.data], { type: "text/csv" });
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = "mdrrmo_activity_logs.csv";
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);
        }),
      {
        loading: "Exporting logs...",
        success: "Sector logs exported successfully!",
        error: "Failed to export logs.",
      },
    );
  };

  const roleOptions = [
    { value: "non_resident", label: "Admins Only (Default)" },
    { value: "", label: "All Roles" },
    { value: "head_mdrrmo_admin", label: "Head MDRRMO Admin" },
    { value: "mdrrmo_admin", label: "MDRRMO Admin" },
    { value: "barangay_admin", label: "Barangay Admin" },
    { value: "resident", label: "Resident" },
  ];

  const actionOptions = [
    { value: "", label: "All Actions" },
    { value: "auth", label: "Authentication" },
    { value: "module", label: "Curriculum & Modules" },
    { value: "role", label: "Account Updates" },
    { value: "export", label: "Exports" },
  ];

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-150 px-6 md:px-12 pt-2 md:pt-2 pb-12 space-y-4">
      <div className="mb-8">
        <nav
          className="flex text-sm text-gray-500 mb-2"
          aria-label="Breadcrumb"
        >
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">Dashboard</li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span>Audited Sector Data</span>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span className="text-gray-900 font-semibold">
                  Activity & Monitoring
                </span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          Activity & Monitoring Logs
        </h1>
        <p className="text-sm font-medium text-gray-500 mt-1">
          MDRRMO and barangay-level activity tracking
        </p>
      </div>

      <ActivityLogFilters
        search={search}
        setSearch={setSearch}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        actionFilter={actionFilter}
        setActionFilter={setActionFilter}
        totalEntries={meta.total}
        onExport={handleExportLogs}
        roleOptions={roleOptions}
        actionOptions={actionOptions}
      />

      <ActivityLogTable
        logs={logs}
        isLoading={isLoading}
        meta={meta}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
      />
    </div>
  );
}
