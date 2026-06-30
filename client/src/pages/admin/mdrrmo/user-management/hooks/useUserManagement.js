import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";

export const useUserManagement = () => {
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "MDRRMO Officer" });
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

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) return alert("Please fill out all fields.");
    
    // In a real application, you'd trigger a mutation here via react-query's useMutation to POST /api/admin/users
    alert("New account parameters registered successfully (Mock Submit).");
    setUserForm({ name: "", email: "", role: "MDRRMO Officer" });
  };

  const handleAccountAction = async (userId, action) => {
    // In a real application, you'd trigger a mutation here via react-query's useMutation
    alert(`Account ID reference node ${userId} successfully updated: ${action.toUpperCase()}`);
  };

  return {
    state: {
      userForm,
      page,
      limit,
      users,
      meta,
      isLoading,
      isError
    },
    actions: {
      setUserForm,
      setPage,
      handleUserSubmit,
      handleAccountAction
    }
  };
};
