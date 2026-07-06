import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";

import toast from "react-hot-toast";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";

import UserActionModal from "./components/UserActionModal/UserActionModal";
import UserTableRow from "./components/UserTableRow";
import UserTableSkeleton from "./components/UserTableSkeleton";
import UserFilters from "./components/UserFilters";
import UserTablePagination from "./components/UserTablePagination";

import BulkActionBar from "./components/BulkActionBar";
import UserTable from "./components/UserTable";

export default function UserManagement() {
  useDocumentTitle("User Management | Admin Console");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [barangayFilter, setBarangayFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [selectedUser, setSelectedUser] = useState(null);
  const [initialModalTab, setInitialModalTab] = useState(0);

  // Clear selections when filters or pagination change
  useEffect(() => {
    setTimeout(() => setSelectedUserIds(new Set()), 0);
  }, [page, limit, debouncedSearch, roleFilter, statusFilter, barangayFilter, setSelectedUserIds]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Expert tip: Stable callback reference prevents re-rendering all memoized rows
  const handleManageClick = useCallback((user, tabIndex = 0) => {
    setSelectedUser(user);
    setInitialModalTab(tabIndex);
  }, []);

  const handleToggleSelect = useCallback((id) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);



  const { data, isLoading } = useQuery({
    queryKey: ["adminUsers", page, limit, debouncedSearch, roleFilter, statusFilter, barangayFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (barangayFilter) params.set("barangay", barangayFilter);
      const res = await apiClient.get(`/users?${params}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const users = data?.data || [];
  const meta = data?.meta || { totalPages: 1, page: 1, total: 0 };

  const mutation = useMutation({
    mutationFn: async ({ type, userId, data: payload }) => {
      switch (type) {
        case "edit":
          return apiClient.put(`/admin/users/${userId}`, payload);
        case "role":
          return apiClient.patch(`/admin/users/${userId}/role`, payload);
        case "password":
          return apiClient.put(`/admin/users/${userId}/password`, payload);
        case "ban":
          return apiClient.patch(`/admin/users/${userId}/ban`, { reason: payload?.reason });
        case "unban":
          return apiClient.patch(`/admin/users/${userId}/unban`);
        case "archive":
          return apiClient.patch(`/admin/users/${userId}/archive`, payload);
        case "bulk_archive":
          return apiClient.patch(`/admin/users/bulk-archive`, payload);
        default:
          throw new Error("Unknown action type");
      }
    },
    onSuccess: (_, variables) => {
      const messages = {
        edit: "User details updated.",
        role: "Role updated.",
        password: "Password reset successfully.",
        ban: "User banned.",
        unban: "Ban removed.",
        archive: "Account status updated.",
        bulk_archive: "Bulk action completed successfully.",
      };
      toast.success(messages[variables.type] || "Done.");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["systemStats"] });
      setSelectedUser(null);
      setSelectedUserIds(new Set());
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Action failed.");
    },
  });

  const handleSave = useCallback(async (action) => {
    await mutation.mutateAsync(action);
  }, [mutation]);

  return (
    <div className="space-y-4">
      <UserFilters
        search={search}
        setSearch={setSearch}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        barangayFilter={barangayFilter}
        setBarangayFilter={setBarangayFilter}
        setPage={setPage}
      />

      <BulkActionBar 
        selectedCount={selectedUserIds.size} 
        onArchive={() => handleSave({ type: "bulk_archive", data: { userIds: Array.from(selectedUserIds), archived: true } })}
        onCancel={() => setSelectedUserIds(new Set())}
        isPending={mutation.isPending && mutation.variables?.type === "bulk_archive"}
      />

      {/* Table Area */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            User Directory
          </h2>
          <span className="text-xs text-gray-500 font-mono">
            {meta.total} total
          </span>
        </div>
        
        <UserTable 
          users={users}
          meta={meta}
          isLoading={isLoading}
          selectedUserIds={selectedUserIds}
          setSelectedUserIds={setSelectedUserIds}
          handleManageClick={handleManageClick}
          handleToggleSelect={handleToggleSelect}
        />

        {/* Pagination */}
        <UserTablePagination 
          isLoading={isLoading} 
          meta={meta} 
          setPage={setPage} 
          limit={limit}
          setLimit={setLimit}
        />
      </div>

      {/* Modal */}
      {selectedUser && (
        <UserActionModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSave={handleSave}
          initialTab={initialModalTab}
        />
      )}
    </div>
  );
}
