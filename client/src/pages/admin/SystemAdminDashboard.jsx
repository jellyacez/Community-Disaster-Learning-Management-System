import useDocumentTitle from "../../hooks/useDocumentTitle";
import { useSystemAdmin } from "./hooks/useSystemAdmin";
import SystemAdminUserTable from "./components/SystemAdminUserTable";

export default function SystemAdminDashboard() {
  useDocumentTitle("Admin Dashboard | Bacolor LMS");
  const { state, actions } = useSystemAdmin();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            System Admin Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Manage all registered users and system roles.
          </p>
        </div>
        <button
          onClick={actions.handleLogout}
          className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>

      <SystemAdminUserTable 
        users={state.users}
        loading={state.loading}
        meta={state.meta}
        setPage={actions.setPage}
        handleEditUser={actions.handleEditUser}
        handleEditRole={actions.handleEditRole}
        handleArchive={actions.handleArchive}
        handleResetPassword={actions.handleResetPassword}
      />
    </div>
  );
}
