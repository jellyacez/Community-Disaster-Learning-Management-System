import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon, Notification01Icon } from "@hugeicons/core-free-icons";

const ROLES = [
  { value: "resident", label: "Resident" },
  { value: "barangay_admin", label: "Barangay Admin" },
  { value: "mdrrmo_admin", label: "MDRRMO Admin" },
  { value: "system_admin", label: "System Admin" },
];

export default function ChangeRoleTab({ user, onSave }) {
  const [role, setRole] = useState(user?.role || "resident");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ type: "role", userId: user.id, data: { role } });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assign Role</label>
        <div className="relative">
          <HugeiconsIcon icon={UserGroupIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 appearance-none bg-white"
          >
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
        <HugeiconsIcon icon={Notification01Icon} className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Assigning <strong>system_admin</strong> grants full platform control. Assign with caution.
        </p>
      </div>
      <div className="pt-2">
        <button type="submit" className="w-full rounded-xl bg-gray-900 text-white py-3 text-sm font-bold hover:bg-black transition-colors">
          Update Role
        </button>
      </div>
    </form>
  );
}
