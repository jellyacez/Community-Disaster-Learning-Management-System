import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "../../lib/auth-client";
import toast from "react-hot-toast";

export default function SystemAdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/users");
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLogout = async () => {
    sessionStorage.setItem("isLoggingOut", "true");
    await authClient.signOut();
    navigate("/");
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
      const res = await fetch(
        `http://localhost:5000/api/admin/users/${user.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName,
            email: newEmail,
            archived: user.archived,
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to update user");
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
      const res = await fetch(
        `http://localhost:5000/api/admin/users/${user.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: user.name,
            email: user.email,
            archived: !user.archived,
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to archive user");
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
      const res = await fetch(
        `http://localhost:5000/api/admin/users/${user.id}/password`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPassword }),
        },
      );
      if (!res.ok) throw new Error("Failed to reset password");
      toast.success("Password reset successfully!");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            System Admin Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Manage all registered users and system roles.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            User Management Directory
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-bold text-gray-900">{user.name}</td>
                    <td className="p-4 text-gray-600">{user.email}</td>
                    <td className="p-4">
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.archived ? (
                        <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
                          Archived
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-4 flex gap-2 justify-end">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                      >
                        Edit User
                      </button>
                      <button
                        onClick={() => handleEditRole(user)}
                        className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                      >
                        Edit Role
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="px-3 py-1.5 text-xs font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg transition"
                      >
                        Reset Pass
                      </button>
                      <button
                        onClick={() => handleArchive(user)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${user.archived ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
                      >
                        {user.archived ? "Unarchive" : "Archive"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
