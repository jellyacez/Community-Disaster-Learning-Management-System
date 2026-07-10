import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import toast from "react-hot-toast";

import ActivityLogFilters from "./components/ActivityLogFilters";
import ActivityLogTable from "./components/ActivityLogTable";

export default function ActivityLog() {
  useDocumentTitle("Activity Log | Admin Console");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("non_resident");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [roleFilter, actionFilter, limit]);

  const { data, isLoading } = useQuery({
    queryKey: ["activityLog", page, limit, debouncedSearch, roleFilter, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter) params.set("role", roleFilter);
      if (actionFilter) params.set("action", actionFilter);
      const res = await apiClient.get(`/admin/activity-log?${params}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const logs = data?.data || [];
  const meta = data?.meta || { totalPages: 1, page: 1, total: 0 };

  const handleExportLogs = () => {
    toast.promise(
      apiClient.get("/admin/activity-log/export", { responseType: "blob" })
        .then((res) => {
          const blob = new Blob([res.data], { type: "text/csv" });
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = "system_activity_logs.csv";
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);
        }),
      {
        loading: 'Exporting logs...',
        success: 'System logs exported successfully!',
        error: 'Failed to export logs.'
      }
    );
  };

  return (
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
