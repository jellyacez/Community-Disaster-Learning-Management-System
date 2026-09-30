import { memo, useState, useRef, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreHorizontalIcon,
  Edit02Icon,
  Key01Icon,
  UserBlock01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import UserStatusBadge from "./UserStatusBadge";
import StatusBadge from "../../../../../components/ui/StatusBadge";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  system_admin: "System Admin",
  mdrrmo_admin: "MDRRMO Admin",
  head_mdrrmo_admin: "Head MDRRMO Admin",
  barangay_admin: "Barangay Admin",
  resident: "Resident",
};

function UserTableRow({
  user,
  onManageClick,
  isSelected,
  onToggleSelect,
  isSuperAdmin,
  currentUserId,
  onImpersonate,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ top: 0, right: 0, openUpwards: false });
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside or scrolling
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      if (isOpen) setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpwards = spaceBelow < 220;

      setMenuCoords({
        top: openUpwards ? rect.top : rect.bottom + 6,
        right: window.innerWidth - rect.right,
        openUpwards,
      });
    }
    setIsOpen((prev) => !prev);
  };

  const handleAction = (tabIndex) => {
    setIsOpen(false);
    onManageClick(user, tabIndex);
  };

  const handleTriggerImpersonate = () => {
    setIsOpen(false);
    if (onImpersonate) {
      onImpersonate(user);
    }
  };

  const canImpersonate = isSuperAdmin && String(user.id) !== String(currentUserId);

  return (
    <tr
      className={`transition-colors ${
        isSelected
          ? "bg-red-50/50 dark:bg-red-950/20"
          : "hover:bg-gray-50/60 dark:hover:bg-slate-800/40"
      }`}
    >
      <td className="px-4 py-3 w-12">
        <label className="min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center cursor-pointer">
          <input
            type="checkbox"
            aria-label={`Select user ${user.name}`}
            checked={isSelected}
            onChange={() => onToggleSelect(user.id)}
            className="w-4 h-4 text-red-600 rounded border-gray-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-red-500 cursor-pointer"
          />
        </label>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-slate-300 uppercase shrink-0">
            {user.name?.charAt(0) || "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
        {user.barangay || "—"}
      </td>
      <td className="px-4 py-3">
        <StatusBadge
          color={
            user.role === "super_admin"
              ? "amber"
              : user.role === "system_admin"
              ? "purple"
              : user.role === "mdrrmo_admin" || user.role === "head_mdrrmo_admin"
              ? "blue"
              : user.role === "barangay_admin"
              ? "teal"
              : "gray"
          }
        >
          {ROLE_LABELS[user.role] || user.role}
        </StatusBadge>
      </td>
      <td className="px-4 py-3">
        <UserStatusBadge user={user} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400 font-mono whitespace-nowrap">
        {user.createdAt
          ? new Date(user.createdAt).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-block text-left">
          <button
            ref={buttonRef}
            onClick={handleToggle}
            className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Open action menu"
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} className="w-5 h-5" />
          </button>

          {isOpen && (
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: menuCoords.openUpwards ? "auto" : `${menuCoords.top}px`,
                bottom: menuCoords.openUpwards ? `${window.innerHeight - menuCoords.top + 6}px` : "auto",
                right: `${menuCoords.right}px`,
              }}
              className="w-48 rounded-xl shadow-xl bg-white dark:bg-slate-900 ring-1 ring-black/10 dark:ring-white/10 divide-y divide-gray-50 dark:divide-slate-800 z-[9999] animate-in fade-in zoom-in-95 duration-100"
            >
              {canImpersonate && (
                <div className="py-1">
                  <button
                    onClick={handleTriggerImpersonate}
                    className="group flex items-center w-full px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon
                      icon={ViewIcon}
                      className="mr-3 w-4 h-4 text-amber-600 dark:text-amber-400"
                    />
                    Impersonate
                  </button>
                </div>
              )}

              <div className="py-1">
                <button
                  onClick={() => handleAction(0)}
                  className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <HugeiconsIcon
                    icon={Edit02Icon}
                    className="mr-3 w-4 h-4 text-gray-400 dark:text-slate-500 group-hover:text-gray-500 dark:group-hover:text-slate-400"
                  />
                  Edit Details
                </button>
                <button
                  onClick={() => handleAction(2)}
                  className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <HugeiconsIcon
                    icon={Key01Icon}
                    className="mr-3 w-4 h-4 text-gray-400 dark:text-slate-500 group-hover:text-gray-500 dark:group-hover:text-slate-400"
                  />
                  Reset Password
                </button>
              </div>
              <div className="py-1">
                <button
                  onClick={() => handleAction(3)}
                  className="group flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                >
                  <HugeiconsIcon
                    icon={UserBlock01Icon}
                    className="mr-3 w-4 h-4 text-red-500 dark:text-red-400 group-hover:text-red-600 dark:group-hover:text-red-300"
                  />
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