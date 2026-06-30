import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authClient } from "../../../lib/auth-client";
import toast from "react-hot-toast";
import apiClient from "../../../lib/apiClient";

export const useSystemAdmin = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 10;

  const {
    data: usersData,
    isLoading: loading,
    refetch: fetchUsers,
  } = useQuery({
    queryKey: ["adminUsers", page],
    queryFn: async () => {
      const response = await apiClient.get(`/users?page=${page}&limit=${limit}`);
      return response.data;
    },
    keepPreviousData: true,
  });

  const users = usersData?.data || [];
  const meta = usersData?.meta || { totalPages: 1, page: 1, total: 0 };

  const handleLogout = async () => {
    sessionStorage.setItem("isLoggingOut", "true");
    await authClient.signOut();
    navigate("/signin");
  };

  const handleEditRole = async (user) => {
    const newRole = window.prompt(
      "Enter new role (resident, barangay_admin, mdrrmo_admin, system_admin):",
      user.role,
    );
    if (!newRole || newRole === user.role) return;

    const { error } = await authClient.admin.setRole({
      userId: user.id,
      role: newRole,
    });
    if (error) {
      toast.error("Failed to update role: " + error.message);
    } else {
      toast.success("Role updated successfully!");
      fetchUsers();
    }
  };

  const handleEditUser = async (user) => {
    const newName = window.prompt("Enter new name:", user.name) || user.name;
    const newEmail =
      window.prompt("Enter new email:", user.email) || user.email;

    if (newName === user.name && newEmail === user.email) return;

    try {
      await apiClient.put(`/admin/users/${user.id}`, {
        name: newName,
        email: newEmail,
        archived: user.archived,
      });
      toast.success("User details updated!");
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleArchive = async (user) => {
    const confirm = window.confirm(
      `Are you sure you want to ${user.archived ? "unarchive" : "archive"} this account?`,
    );
    if (!confirm) return;

    try {
      await apiClient.put(`/admin/users/${user.id}`, {
        name: user.name,
        email: user.email,
        archived: !user.archived,
      });
      toast.success(
        user.archived
          ? "Account unarchived!"
          : "Account archived successfully!",
      );
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleResetPassword = async (user) => {
    const newPassword = window.prompt("Enter new password (min 8 chars):");
    if (!newPassword || newPassword.length < 8) {
      if (newPassword) toast.error("Password must be at least 8 characters.");
      return;
    }

    try {
      await apiClient.put(`/admin/users/${user.id}/password`, {
        password: newPassword,
      });
      toast.success("Password reset successfully!");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return {
    state: {
      page,
      limit,
      users,
      meta,
      loading,
    },
    actions: {
      setPage,
      handleLogout,
      handleEditRole,
      handleEditUser,
      handleArchive,
      handleResetPassword,
    },
  };
};
