import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";
import useDebounce from "../../../../../hooks/useDebounce";

const EMPTY_FORM = { name: "", email: "", role: "barangay_admin", barangay: "" };

// Row actions: endpoint, request body, and the toast shown on success
const ACCOUNT_ACTIONS = {
  archive: { path: "archive", body: { archived: true }, done: "archived" },
  restore: { path: "archive", body: { archived: false }, done: "restored" },
  ban: { path: "ban", body: {}, done: "banned" },
  unban: { path: "unban", body: {}, done: "unbanned" },
};

export const useUserManagement = () => {
  const queryClient = useQueryClient();
  const [userForm, setUserForm] = useState(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: usersData, isLoading, isError } = useQuery({
    queryKey: ["adminUsers", page, limit, debouncedSearch, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      if (roleFilter) params.append("role", roleFilter);
      const res = await apiClient.get(`/users?${params.toString()}`);
      return res.data;
    },
    retry: 1,
    placeholderData: keepPreviousData,
  });

  const users = usersData?.data || [];
  const meta = usersData?.meta || { totalPages: 1, page: 1, total: 0 };

  const mutation = useMutation({
    mutationFn: async ({ type, payload }) => {
      if (type === "provision") return apiClient.post(`/admin/users/provision`, payload);
      const action = ACCOUNT_ACTIONS[type];
      if (!action) throw new Error("Unknown action type");
      return apiClient.patch(`/admin/users/${payload.userId}/${action.path}`, action.body);
    },
    onSuccess: (res, variables) => {
      if (variables.type === "provision") {
        // The server says whether the credentials email actually went out
        toast.success(res?.data?.message || `Account created for ${variables.payload.email}.`, { duration: 6000 });
        setUserForm(EMPTY_FORM);
      } else {
        toast.success(`${variables.payload.name} was ${ACCOUNT_ACTIONS[variables.type].done}.`);
      }
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (err) => {
      const data = err?.response?.data;
      toast.error(data?.message || data?.error || "Action failed.");
    }
  });

  // Resolves true only when the account was created, so the caller knows whether to close the form
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) {
      toast.error("Please fill out all fields.");
      return false;
    }
    if (userForm.role === "barangay_admin" && !userForm.barangay) {
      toast.error("Choose the barangay this admin will manage.");
      return false;
    }

    return mutation.mutateAsync({
      type: "provision",
      payload: {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        ...(userForm.role === "barangay_admin" ? { barangay: userForm.barangay } : {}),
      },
    })
      .then(() => true)
      .catch(() => false); // onError already shows the toast
  };

  // action: "archive" | "restore" | "ban" | "unban"
  const handleAccountAction = async (user, action) => {
    const prompts = {
      archive: `Archive ${user.name}? They will no longer be able to sign in until restored.`,
      restore: `Restore ${user.name}'s account?`,
      ban: `Ban ${user.name}? They will be signed out and blocked from signing in.`,
      unban: `Lift the ban on ${user.name}?`,
    };
    if (!window.confirm(prompts[action])) return;
    await mutation
      .mutateAsync({ type: action, payload: { userId: user.id || user._id, name: user.name } })
      .catch(() => {}); // onError already shows the toast
  };

  return {
    state: {
      userForm,
      page,
      limit,
      search,
      roleFilter,
      users,
      meta,
      isLoading,
      isError,
      isMutationPending: mutation.isPending
    },
    actions: {
      setUserForm,
      setPage,
      setLimit: (newLimit) => {
        setLimit(newLimit);
        setPage(1);
      },
      setSearch,
      setRoleFilter,
      handleUserSubmit,
      handleAccountAction
    }
  };
};
