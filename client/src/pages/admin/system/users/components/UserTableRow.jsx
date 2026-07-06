import { memo, useState, useRef, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreHorizontalIcon, Edit02Icon, Key01Icon, UserBlock01Icon } from "@hugeicons/core-free-icons";
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

function UserTableRow({ user, onManageClick, isSelected, onToggleSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (tabIndex) => {
    setIsOpen(false);
    onManageClick(user, tabIndex);
  };

  return (
    <tr className={`transition-colors ${isSelected ? "bg-red-50/50" : "hover:bg-gray-50/60"}`}>
      <td className="px-4 py-3 w-10">
        <input 
          type="checkbox" 
          aria-label={`Select user ${user.name}`}
          checked={isSelected} 
          onChange={() => onToggleSelect(user.id)}
          className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 uppercase shrink-0">
            {user.name?.charAt(0) || "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
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
      <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="relative inline-block text-left" ref={menuRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open action menu"
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} className="w-5 h-5" />
          </button>
          
          {isOpen && (
            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-50 z-50">
              <div className="py-1">
                <button
                  onClick={() => handleAction(0)}
                  className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                >
                  <HugeiconsIcon icon={Edit02Icon} className="mr-3 w-4 h-4 text-gray-400 group-hover:text-gray-500" />
                  Edit Details
                </button>
                <button
                  onClick={() => handleAction(2)}
                  className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                >
                  <HugeiconsIcon icon={Key01Icon} className="mr-3 w-4 h-4 text-gray-400 group-hover:text-gray-500" />
                  Reset Password
                </button>
              </div>
              <div className="py-1">
                <button
                  onClick={() => handleAction(3)}
                  className="group flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <HugeiconsIcon icon={UserBlock01Icon} className="mr-3 w-4 h-4 text-red-500 group-hover:text-red-600" />
                  Suspend / Archive
                </button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default memo(UserTableRow);
