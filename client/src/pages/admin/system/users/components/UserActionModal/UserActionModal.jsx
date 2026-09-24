import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import EditDetailsTab from "./EditDetailsTab";
import ChangeRoleTab from "./ChangeRoleTab";
import ResetPasswordTab from "./ResetPasswordTab";
import DeactivateArchiveTab from "./DeactivateArchiveTab";

const TABS = ["Edit Details", "Change Role", "Reset Password", "Deactivate / Archive"];

export default function UserActionModal({ user, onClose, onSave, initialTab = 0 }) {
  const [tab, setTab] = useState(initialTab);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center font-bold text-gray-600 dark:text-slate-300 text-sm uppercase">
              {user.name?.charAt(0) || "?"}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{user.name}</h3>
              <p className="text-xs text-gray-400 dark:text-slate-500">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-slate-800 overflow-x-auto">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                tab === i
                  ? "border-gray-900 text-gray-900 dark:border-red-500 dark:text-red-400"
                  : "border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto h-[400px] custom-scrollbar">
          {tab === 0 && <EditDetailsTab user={user} onSave={onSave} />}
          {tab === 1 && <ChangeRoleTab user={user} onSave={onSave} />}
          {tab === 2 && <ResetPasswordTab user={user} onSave={onSave} />}
          {tab === 3 && <DeactivateArchiveTab user={user} onSave={onSave} />}
        </div>
      </div>
    </div>
  );
}
