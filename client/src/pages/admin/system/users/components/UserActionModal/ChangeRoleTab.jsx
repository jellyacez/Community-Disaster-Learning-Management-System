import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon, Notification01Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import { authClient } from "../../../../../../lib/auth-client";

const BASE_ROLES = [
  { value: "resident", label: "Resident" },
  { value: "barangay_admin", label: "Barangay Admin" },
  { value: "mdrrmo_admin", label: "MDRRMO Admin" },
  { value: "head_mdrrmo_admin", label: "Head MDRRMO Admin" },
  { value: "system_admin", label: "System Admin" },
];

export default function ChangeRoleTab({ user, onSave }) {
  const { data: session } = authClient.useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const isSelf = String(user?.id) === String(session?.user?.id);

  const [role, setRole] = useState(user?.role || "resident");

  const availableRoles = [
    ...(isSuperAdmin ? [{ value: "super_admin", label: "Super Admin" }] : []),
    ...BASE_ROLES,
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSelf && role !== "super_admin") {
      alert("Action prohibited: You cannot revoke your own Super Admin access.");
      return;
    }
    onSave({ type: "role", userId: user.id, data: { role } });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
          Assign Role
        </label>
        <div className="relative">
          <HugeiconsIcon
            icon={UserGroupIcon}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500"
          />
          <select
            value={role}
            disabled={isSelf}
            onChange={(e) => setRole(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-slate-700 appearance-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {availableRoles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isSelf ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex gap-3">
          <HugeiconsIcon
            icon={Alert02Icon}
            className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
          />
          <p className="text-sm text-red-800 dark:text-red-300">
            You cannot alter your own administrative role to prevent accidental system lockouts.
          </p>
        </div>
      ) : role === "super_admin" ? (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex gap-3">
          <HugeiconsIcon
            icon={Notification01Icon}
            className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
          />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Super Admin</strong> grants full root authority across all barangays, audits, and user governance.
          </p>
        </div>
      ) : role === "system_admin" ? (
        <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 rounded-xl p-4 flex gap-3">
          <HugeiconsIcon
            icon={Notification01Icon}
            className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5"
          />
          <p className="text-sm text-purple-800 dark:text-purple-300">
            <strong>System Admin</strong> grants infrastructure, settings, and user administration access.
          </p>
        </div>
      ) : null}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSelf}
          className="w-full rounded-xl bg-gray-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white py-3 text-sm font-bold hover:bg-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Update Role
        </button>
      </div>
    </form>
  );
}