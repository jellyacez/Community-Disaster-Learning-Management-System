import { HugeiconsIcon } from "@hugeicons/react";
import { UserAdd01Icon } from "@hugeicons/core-free-icons";

import useDocumentTitle from "../../../../hooks/useDocumentTitle";

import UserActionModal from "./components/UserActionModal/UserActionModal";
import AdminProvisionModal from "./components/AdminProvisionModal";
import UserFilters from "./components/UserFilters";
import UserTablePagination from "./components/UserTablePagination";

import BulkActionBar from "./components/BulkActionBar";
import UserTable from "./components/UserTable";

import { useUserManagement } from "./hooks/useUserManagement";

export default function UserManagement() {
  useDocumentTitle("User Management | Admin Console");
  const { state, actions } = useUserManagement();

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-150 px-6 md:px-12 pt-2 md:pt-2 pb-12 space-y-4">
      <div className="mb-8">
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">Admin Portal</li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span className="text-gray-900 font-semibold">User Management</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">User Management</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">
          Platform-wide control, access provisioning, and user administration
        </p>
      </div>
      <UserFilters
        search={state.search}
        setSearch={actions.setSearch}
        roleFilter={state.roleFilter}
        setRoleFilter={actions.setRoleFilter}
        statusFilter={state.statusFilter}
        setStatusFilter={actions.setStatusFilter}
        barangayFilter={state.barangayFilter}
        setBarangayFilter={actions.setBarangayFilter}
        setPage={actions.setPage}
      />

      <BulkActionBar
        selectedCount={state.selectedUserIds.size}
        onArchive={() =>
          actions.handleSave({
            type: "bulk_archive",
            data: {
              userIds: Array.from(state.selectedUserIds),
              archived: true,
            },
          })
        }
        onCancel={() => actions.setSelectedUserIds(new Set())}
        isPending={
          state.isMutationPending && state.mutationType === "bulk_archive"
        }
      />

      {/* Table Area */}
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
            onClick={() => actions.setShowProvisionModal(true)}
            className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
          >
            <HugeiconsIcon icon={UserAdd01Icon} size={16} />
            <span>Add Admin</span>
          </button>
        </div>

        <UserTable
          users={state.users}
          meta={state.meta}
          isLoading={state.isLoading}
          selectedUserIds={state.selectedUserIds}
          setSelectedUserIds={actions.setSelectedUserIds}
          handleManageClick={actions.handleManageClick}
          handleToggleSelect={actions.handleToggleSelect}
        />

        {/* Pagination */}
        <UserTablePagination
          isLoading={state.isLoading}
          meta={state.meta}
          setPage={actions.setPage}
          limit={state.limit}
          setLimit={actions.setLimit}
        />
      </div>

      {/* Modals */}
      {state.selectedUser && (
        <UserActionModal
          user={state.selectedUser}
          onClose={() => actions.setSelectedUser(null)}
          onSave={actions.handleSave}
          initialTab={state.initialModalTab}
        />
      )}

      {state.showProvisionModal && (
        <AdminProvisionModal
          onClose={() => actions.setShowProvisionModal(false)}
        />
      )}
    </div>
  );
}
