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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-150">
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
      />
    </div>
  );
}
