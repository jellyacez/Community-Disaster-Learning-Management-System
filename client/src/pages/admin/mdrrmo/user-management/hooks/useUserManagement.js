import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";

export const useUserManagement = () => {
  const queryClient = useQueryClient();
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "barangay_admin" });
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: usersData, isLoading, isError } = useQuery({
    queryKey: ["adminUsers", page],
    queryFn: async () => {
      const res = await apiClient.get(`/users?page=${page}&limit=${limit}`);
      return res.data;
    },
    retry: 1,
    keepPreviousData: true,
  });

  const users = usersData?.data || [];
  const meta = usersData?.meta || { totalPages: 1, page: 1 };

  const mutation = useMutation({
    mutationFn: async ({ type, payload }) => {
      switch (type) {
        case "provision":
          return apiClient.post(`/admin/users/provision`, payload);
        case "archived system account record":
          return apiClient.patch(`/admin/users/${payload.userId}/archive`);
        case "banned and terminated authorization credentials":
          return apiClient.patch(`/admin/users/${payload.userId}/ban`);
        default:
          throw new Error("Unknown action type");
      }
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.type === "provision" 
          ? "New account parameters registered successfully." 
          : `Account ID reference node ${variables.payload.userId} successfully updated: ${variables.type.toUpperCase()}`
      );
      if (variables.type === "provision") {
        setUserForm({ name: "", email: "", role: "barangay_admin" });
      }
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Action failed.");
    }
  });

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) return toast.error("Please fill out all fields.");
    
    await mutation.mutateAsync({ 
      type: "provision", 
      payload: {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role 
      }
    });
  };

  const handleAccountAction = async (userId, action) => {
    if (window.confirm(`Are you sure you want to perform this action? This cannot be easily undone.`)) {
      await mutation.mutateAsync({
        type: action,
        payload: { userId }
      });
    }
  };

  return {
    state: {
      userForm,
      page,
      limit,
      users,
      meta,
      isLoading,
      isError,
      isMutationPending: mutation.isPending
    },
    actions: {
      setUserForm,
      setPage,
      handleUserSubmit,
      handleAccountAction
    }
  };
};
