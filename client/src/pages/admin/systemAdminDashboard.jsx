import React from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "../../lib/auth-client";

export default function SystemAdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authClient.signOut();
    navigate("/");
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">System Admin Dashboard</h1>
      <p>
        Welcome to the System Admin Dashboard! Here you can manage users, view
        system logs, and perform administrative tasks.
      </p>
      <button
        onClick={handleLogout}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  );
}
