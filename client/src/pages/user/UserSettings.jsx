import React, { useState } from "react";
import { authClient } from "../../lib/auth-client";
import DashboardLayout from "./components/DashboardLayout";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";

function formatRole(role) {
  switch (role) {
    case 'system_admin': return 'System Administrator';
    case 'mdrrmo_admin': return 'MDRRMO Administrator';
    case 'barangay_admin': return 'Barangay Administrator';
    case 'user': return 'Resident / Learner';
    default: return role || 'Resident / Learner';
  }
}

export default function UserSettings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  const currentUser = {
    name: session?.user?.name || session?.user?.fullName || session?.user?.username || 'User',
    email: session?.user?.email || 'No email available',
    barangay: session?.user?.barangay || 'No barangay set',
    role: formatRole(session?.user?.role),
  };

  const userInitials = currentUser.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      window.location.href = '/signin';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isPending) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <DashboardLayout
      currentUser={currentUser}
      userInitials={userInitials}
      onLogout={handleLogout}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account preferences and system options.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              Profile Preferences
            </h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Display Name
                </label>
                <input
                  type="text"
                  defaultValue={currentUser.name}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-red-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  defaultValue={currentUser.email}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-red-400"
                />
              </div>
              <button className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition">
                Save Changes
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Security</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-red-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-red-400"
                />
              </div>
              <button className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
