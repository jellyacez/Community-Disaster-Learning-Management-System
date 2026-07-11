import UserTableRow from "./UserTableRow";
import UserTableSkeleton from "./UserTableSkeleton";

export default function UserTable({
  users,
  isLoading,
  selectedUserIds,
  setSelectedUserIds,
  handleManageClick,
  handleToggleSelect
}) {
  return (
    <div className="overflow-x-auto min-h-[280px]">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 font-semibold w-10">
              <label htmlFor="select-all-users" className="sr-only">Select all users</label>
              <input 
                id="select-all-users"
                type="checkbox" 
                aria-label="Select all users"
                onChange={(e) => {
                  if (e.target.checked) setSelectedUserIds(new Set(users.map(u => u.id)));
                  else setSelectedUserIds(new Set());
                }}
                checked={users.length > 0 && selectedUserIds.size === users.length}
                className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
              />
            </th>
            <th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">Barangay</th>
            <th className="px-4 py-3 font-semibold">Role</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Joined</th>
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading
            ? [1, 2, 3, 4, 5, 6, 7].map(i => <UserTableSkeleton key={i} />)
            : users.length === 0
            ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-500 text-sm">
                  No users found.
                </td>
              </tr>
            )
            : users.map(user => (
              <UserTableRow
                key={user.id}
                user={user}
                onManageClick={handleManageClick}
                isSelected={selectedUserIds.has(user.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
        </tbody>
      </table>
    </div>
  );
}
