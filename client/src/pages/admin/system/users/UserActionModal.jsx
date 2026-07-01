import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  UserGroupIcon,
  Notification01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";

const ROLES = [
  { value: "resident", label: "Resident" },
  { value: "barangay_admin", label: "Barangay Admin" },
  { value: "mdrrmo_admin", label: "MDRRMO Admin" },
  { value: "system_admin", label: "System Admin" },
];

const TABS = ["Edit Details", "Change Role", "Reset Password", "Ban / Archive"];

export default function UserActionModal({ user, onClose, onSave }) {
  const [tab, setTab] = useState(0);

  // Tab 0 — Edit Details
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  // Tab 1 — Change Role
  const [role, setRole] = useState(user?.role || "resident");

  // Tab 2 — Reset Password
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Tab 3 — Ban / Archive
  const [banReason, setBanReason] = useState("");

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tab === 0) await onSave({ type: "edit", userId: user.id, data: { name, email } });
    if (tab === 1) await onSave({ type: "role", userId: user.id, data: { role } });
    if (tab === 2) await onSave({ type: "password", userId: user.id, data: { password } });
    if (tab === 3 && !user.banned) await onSave({ type: "ban", userId: user.id, data: { reason: banReason } });
    if (tab === 3 && user.banned) await onSave({ type: "unban", userId: user.id });
  };

  const handleArchive = async () => {
    await onSave({ type: "archive", userId: user.id, data: { archived: !user.archived } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm uppercase">
              {user.name?.charAt(0) || "?"}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{user.name}</h3>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 ${
                tab === i
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tab 0: Edit Details */}
            {tab === 0 && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <HugeiconsIcon icon={UserGroupIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      placeholder="Full name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <HugeiconsIcon icon={Notification01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      placeholder="Email"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full rounded-xl bg-gray-900 text-white py-3 text-sm font-bold hover:bg-black transition-colors">
                  Save Changes
                </button>
              </>
            )}

            {/* Tab 1: Change Role */}
            {tab === 1 && (
              <>
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
                  <HugeiconsIcon icon={Notification01Icon} className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Assigning <strong>system_admin</strong> grants full platform control. Assign with caution.
                  </p>
                </div>
                <button type="submit" className="w-full rounded-xl bg-gray-900 text-white py-3 text-sm font-bold hover:bg-black transition-colors">
                  Update Role
                </button>
              </>
            )}

            {/* Tab 2: Reset Password */}
            {tab === 2 && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <HugeiconsIcon icon={Settings01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      minLength={8}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      placeholder="Min. 8 characters"
                    />
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} className="rounded" />
                    <span className="text-xs text-gray-500">Show password</span>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={password.length < 8}
                  className="w-full rounded-xl bg-amber-600 text-white py-3 text-sm font-bold hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  Reset Password
                </button>
              </>
            )}

            {/* Tab 3: Ban / Archive */}
            {tab === 3 && (
              <div className="space-y-4">
                {/* Ban / Unban */}
                <div className="p-5 rounded-2xl border border-red-100 bg-red-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-red-900">
                        {user.banned ? "This user is currently banned" : "Ban this user"}
                      </p>
                      {user.banReason && (
                        <p className="text-xs text-red-700 mt-0.5">Reason: {user.banReason}</p>
                      )}
                    </div>
                  </div>
                  {!user.banned && (
                    <div>
                      <label className="block text-xs font-semibold text-red-800 mb-1">Ban Reason</label>
                      <input
                        type="text"
                        value={banReason}
                        onChange={e => setBanReason(e.target.value)}
                        placeholder="Enter reason for ban..."
                        className="w-full px-3 py-2 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    className={`w-full rounded-xl py-2.5 text-sm font-bold transition-colors ${
                      user.banned
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                  >
                    {user.banned ? "Remove Ban" : "Ban User"}
                  </button>
                </div>

                {/* Archive / Restore */}
                <div className={`p-5 rounded-2xl border space-y-3 ${user.archived ? "border-emerald-100 bg-emerald-50" : "border-gray-100 bg-gray-50"}`}>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {user.archived ? "Restore this account" : "Archive this account"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {user.archived
                        ? "Restoring gives the user full access again."
                        : "Archiving disables access without deleting the account."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleArchive}
                    className={`w-full rounded-xl py-2.5 text-sm font-bold transition-colors ${
                      user.archived
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-gray-900 text-white hover:bg-black"
                    }`}
                  >
                    {user.archived ? "Restore Account" : "Archive Account"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
