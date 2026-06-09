import React, { useState } from 'react';
import { authClient } from '../../lib/auth-client';
import DashboardLayout from '../../user/DashboardLayout';

function formatRole(role) {
  switch (role) {
    case 'system_admin':
      return 'System Administrator';
    case 'mdrrmo_admin':
      return 'MDRRMO Administrator';
    case 'barangay_admin':
      return 'Barangay Administrator';
    case 'user':
      return 'Resident / Learner';
    default:
      return role || 'Resident / Learner';
  }
}

export default function UserProfile() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  const currentUser = {
    name: session?.user?.name || session?.user?.fullName || session?.user?.username || 'User',
    email: session?.user?.email || 'No email available',
    barangay: session?.user?.barangay || 'No barangay set',
    role: formatRole(session?.user?.role),
  };

  const userInitials = currentUser.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
          <h1 className="text-3xl font-extrabold text-gray-900">User Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            View your account information and learning identity.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-100 text-3xl font-extrabold text-red-700">
                {userInitials}
              </div>
              <h2 className="mt-4 text-xl font-bold text-gray-900">{currentUser.name}</h2>
              <p className="text-sm text-gray-500">{currentUser.role}</p>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Account Details</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Full Name
                </p>
                <p className="mt-1 text-base font-semibold text-gray-900">{currentUser.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Email
                </p>
                <p className="mt-1 text-base font-semibold text-gray-900">{currentUser.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Barangay
                </p>
                <p className="mt-1 text-base font-semibold text-gray-900">{currentUser.barangay}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Role
                </p>
                <p className="mt-1 text-base font-semibold text-gray-900">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}