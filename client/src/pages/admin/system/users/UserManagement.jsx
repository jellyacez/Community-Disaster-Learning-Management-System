import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";
import { authClient } from "../../../../lib/auth-client";
import toast from "react-hot-toast";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";

import UserActionModal from "./components/UserActionModal/UserActionModal";
import UserTableRow from "./components/UserTableRow";
import UserTableSkeleton from "./components/UserTableSkeleton";
import UserFilters from "./components/UserFilters";
import UserTablePagination from "./components/UserTablePagination";

export default function UserManagement() {
  useDocumentTitle("User Management | Admin Console");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [selectedUser, setSelectedUser] = useState(null);

  // Clear selections when filters or pagination change
  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [page, limit, debouncedSearch, roleFilter, statusFilter, setSelectedUserIds]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Expert tip: Stable callback reference prevents re-rendering all memoized rows
  const handleManageClick = useCallback((user) => {
    setSelectedUser(user);
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
    queryKey: ["adminUsers", page, limit, debouncedSearch, roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
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
        setPage={setPage}
      />

      {/* Bulk Action Bar */}
      {selectedUserIds.size > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-semibold text-red-800">
            {selectedUserIds.size} users selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleSave({ type: "bulk_archive", data: { userIds: Array.from(selectedUserIds), archived: true } })}
              disabled={mutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {mutation.isPending && mutation.variables?.type === "bulk_archive" && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Archive Selected
            </button>
            <button
              onClick={() => setSelectedUserIds(new Set())}
              disabled={mutation.isPending}
              className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            User Directory
          </h2>
          <span className="text-xs text-gray-500 font-mono">
            {meta.total} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold w-10">
                  <label htmlFor="select-all-users" className="sr-only">Select all users</label>
                  <input 
                    id="select-all-users"
                    type="checkbox" 
                    aria-label="Select all users"
                    onChange={(e) => {
                      if (e.target.checked) setSelectedUserIds(new Set(users.map(u => u.id)));
                      else setSelectedUserIds(new Set());
                    }}
                    checked={users.length > 0 && selectedUserIds.size === users.length}
                    className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Barangay</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? [1, 2, 3, 4, 5, 6, 7].map(i => <UserTableSkeleton key={i} />)
                : users.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-500 text-sm">
                      No users found.
                    </td>
                  </tr>
                )
                : users.map(user => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    onManageClick={handleManageClick}
                    isSelected={selectedUserIds.has(user.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
            </tbody>
          </table>
        </div>

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
        />
      )}
    </div>
  );
}
