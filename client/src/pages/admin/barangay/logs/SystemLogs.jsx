import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import useDebounce from "../../../../hooks/useDebounce";
import toast from "react-hot-toast";

import ActivityLogFilters from "../../../../components/ui/logs/ActivityLogFilters";
import ActivityLogTable from "../../../../components/ui/logs/ActivityLogTable";

export default function SystemLogs() {
  useDocumentTitle("System Web Logs Audit Trail | Barangay Admin");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [roleFilter, setRoleFilter] = useState("resident");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Reset page on filter changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [actionFilter, limit, debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ["barangayActivityLogs", page, limit, debouncedSearch, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (actionFilter) params.set("action", actionFilter);
      const res = await apiClient.get(`/admin/barangay/activity-log?${params}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const logs = data?.data || [];
  const meta = data?.meta || { totalPages: 1, page: 1, total: 0 };

  const handleExportLogs = () => {
    // Wait, barangay controller doesn't have an export endpoint!
    // I will mock this for now or remove the export button if there's no endpoint.
    // Actually, I'll just show a toast since implementing CSV export is backend work.
    toast.error("Export is not yet supported for Barangay Admin logs.");
  };

  const roleOptions = [
    { value: "resident", label: "Residents Only" },
  ];

  const actionOptions = [
    { value: "", label: "All Actions" },
    { value: "auth", label: "Authentication & Passwords" },
    { value: "account", label: "Account Creation" },
    { value: "learning", label: "Learning Activity (Modules/Certs)" },
  ];

  return (
    <>
      <div className="mb-8">
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">Dashboard</li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span className="text-gray-900 font-semibold">System Web Logs Audit Trail</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Web Logs Audit Trail</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">Monitor system activities and user actions in your barangay</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
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
          hideRoleColumn={true}
        />
      </div>
    </>
  );
}