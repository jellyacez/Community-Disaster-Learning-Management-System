import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";
import useDebounce from "../../../../../hooks/useDebounce";

export const useUserManagement = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [barangayFilter, setBarangayFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [selectedUser, setSelectedUser] = useState(null);
  const [initialModalTab, setInitialModalTab] = useState(0);
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  // Clear selections when filters or pagination change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedUserIds(new Set());
    setPage(1);
  }, [page, limit, debouncedSearch, roleFilter, statusFilter, barangayFilter, setSelectedUserIds]);

  // Stable callback reference prevents re-rendering all memoized rows
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
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["adminUsers"] });

      // Snapshot the previous value
      const previousUsersData = queryClient.getQueryData([
        "adminUsers", page, limit, debouncedSearch, roleFilter, statusFilter, barangayFilter
      ]);

      // Optimistically update to the new value if it's a simple toggle like ban/unban
      if (variables.type === "ban" || variables.type === "unban") {
        queryClient.setQueryData(
          ["adminUsers", page, limit, debouncedSearch, roleFilter, statusFilter, barangayFilter],
          (old) => {
            if (!old || !old.data) return old;
            return {
              ...old,
              data: old.data.map(user => 
                user.id === variables.userId 
                  ? { ...user, status: variables.type === "ban" ? "banned" : "active" }
                  : user
              )
            };
          }
        );
      }

      // Return context
      return { previousUsersData };
    },
    onError: (err, variables, context) => {
      // Roll back
      if (context?.previousUsersData) {
        queryClient.setQueryData(
          ["adminUsers", page, limit, debouncedSearch, roleFilter, statusFilter, barangayFilter],
          context.previousUsersData
        );
      }
      toast.error(err?.response?.data?.error || "Action failed.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
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
      queryClient.invalidateQueries({ queryKey: ["systemStats"] });
      setSelectedUser(null);
      setSelectedUserIds(new Set());
    },
  });

  const handleSave = useCallback(async (action) => {
    await mutation.mutateAsync(action);
  }, [mutation]);

  return {
    state: {
      search,
      roleFilter,
      statusFilter,
      barangayFilter,
      page,
      limit,
      selectedUserIds,
      selectedUser,
      initialModalTab,
      showProvisionModal,
      users: data?.data || [],
      meta: data?.meta || { totalPages: 1, page: 1, total: 0 },
      isLoading,
      isMutationPending: mutation.isPending,
      mutationType: mutation.variables?.type
    },
    actions: {
      setSearch,
      setRoleFilter,
      setStatusFilter,
      setBarangayFilter,
      setPage,
      setLimit,
      setSelectedUserIds,
      setSelectedUser,
      setShowProvisionModal,
      handleManageClick,
      handleToggleSelect,
      handleSave
    }
  };
};
