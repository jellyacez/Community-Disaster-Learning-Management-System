import { useUserManagement } from "./hooks/useUserManagement";
import UserDirectoryTable from "./components/UserDirectoryTable";
import RegisterPersonnelForm from "./components/RegisterPersonnelForm";

export default function UserManagement() {
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
                <span className="text-gray-900 font-semibold">System Personnel</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Personnel</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">Manage MDRRMO and Barangay Admins</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <UserDirectoryTable 
          users={state.users}
          isLoading={state.isLoading}
          meta={state.meta}
          setPage={actions.setPage}
          handleAccountAction={actions.handleAccountAction}
        />
        
        <RegisterPersonnelForm 
          userForm={state.userForm}
          setUserForm={actions.setUserForm}
          handleUserSubmit={actions.handleUserSubmit}
          handleToggleMfa={actions.handleToggleMfa}
        />
      </div>
    </div>
  );
}
