import { useUserManagement } from "./hooks/useUserManagement";
import UserDirectoryTable from "./components/UserDirectoryTable";
import RegisterPersonnelForm from "./components/RegisterPersonnelForm";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserAdd01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

export default function UserManagement() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { state, actions } = useUserManagement();

  if (state.isError) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
        <p className="font-bold">Error loading user data.</p>
        <p className="text-sm">Please ensure the backend routes are connected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Breadcrumb */}
      <div className="mb-8">
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">Dashboard</li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span>Administrative Operations</span>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span className="text-gray-900 font-semibold">User Directory</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">User Directory</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">Manage MDRRMO and Barangay Admins</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900">
              User Directory
            </h2>
            <span className="text-xs text-gray-500 font-mono">
              {state.meta.total} total
            </span>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors w-full sm:w-auto shadow-2xs cursor-pointer"
          >
            <HugeiconsIcon icon={UserAdd01Icon} size={16} />
            <span>Add Personnel</span>
          </button>
        </div>

        {/* Basic Hierarchy-Independent Filters (Search + Role) */}
        <div className="px-6 py-3.5 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <HugeiconsIcon icon={Search01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              aria-label="Search personnel by name or email"
              value={state.search}
              onChange={(e) => {
                actions.setSearch(e.target.value);
                actions.setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="mdrrmo-role-filter" className="sr-only">Filter by role</label>
            <select
              id="mdrrmo-role-filter"
              value={state.roleFilter}
              aria-label="Filter by role"
              onChange={(e) => {
                actions.setRoleFilter(e.target.value);
                actions.setPage(1);
              }}
              className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="barangay_admin">Barangay Admin</option>
              <option value="mdrrmo_admin">MDRRMO Admin</option>
              <option value="head_mdrrmo_admin">Head MDRRMO Admin</option>
              <option value="resident">Resident</option>
            </select>
          </div>
        </div>

        <UserDirectoryTable 
          users={state.users}
          isLoading={state.isLoading}
          meta={state.meta}
          setPage={actions.setPage}
        />
        
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <RegisterPersonnelForm 
                userForm={state.userForm}
                setUserForm={actions.setUserForm}
                isSubmitting={state.isMutationPending}
                handleUserSubmit={async (e) => {
                  try {
                    await actions.handleUserSubmit(e);
                    setIsAddModalOpen(false);
                  } catch (err) {
                    // Stay open on error so user can correct
                  }
                }}
                onClose={() => setIsAddModalOpen(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
