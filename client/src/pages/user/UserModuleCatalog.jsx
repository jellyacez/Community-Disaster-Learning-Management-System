import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { authClient } from '../../lib/auth-client';
import DashboardLayout from '../../user/DashboardLayout';
import ModuleCard from '../../user/ModuleCard';
import { modules } from './userData.js';

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

export default function UserModuleCatalog() {
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
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Module Catalog</h1>
            <p className="mt-1 text-sm text-gray-500">
              Explore training modules and enroll when ready.
            </p>
          </div>

          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search modules..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-red-400"
            />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {modules.map((module) => (
            <ModuleCard key={module.id} module={module} enrolled={module.enrolled} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}