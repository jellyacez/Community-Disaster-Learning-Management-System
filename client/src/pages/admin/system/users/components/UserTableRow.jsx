import React from "react";
import UserStatusBadge from "./UserStatusBadge";

const ROLE_COLORS = {
  system_admin: "bg-purple-100 text-purple-800",
  mdrrmo_admin: "bg-blue-100 text-blue-800",
  barangay_admin: "bg-teal-100 text-teal-800",
  resident: "bg-gray-100 text-gray-700",
};

const ROLE_LABELS = {
  system_admin: "System Admin",
  mdrrmo_admin: "MDRRMO Admin",
  barangay_admin: "Barangay Admin",
  resident: "Resident",
};

function UserTableRow({ user, onManageClick }) {
  // Extracting into a separate handler prevents an inline arrow function in the JSX
  const handleManage = () => {
    onManageClick(user);
  };

  return (
    <tr className="hover:bg-gray-50/60 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 uppercase flex-shrink-0">
            {user.name?.charAt(0) || "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{user.barangay || "—"}</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-700"}`}>
          {ROLE_LABELS[user.role] || user.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <UserStatusBadge user={user} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleManage}
          className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Manage
        </button>
      </td>
    </tr>
  );
}

// React.memo prevents re-rendering the row unless the user object or the onManageClick function changes.
// We must ensure onManageClick is wrapped in useCallback in the parent!
export default React.memo(UserTableRow);
