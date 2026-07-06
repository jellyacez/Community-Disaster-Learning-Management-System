import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import EditDetailsTab from "./EditDetailsTab";
import ChangeRoleTab from "./ChangeRoleTab";
import ResetPasswordTab from "./ResetPasswordTab";
import DeactivateArchiveTab from "./DeactivateArchiveTab";

const TABS = ["Edit Details", "Change Role", "Reset Password", "Deactivate / Archive"];

export default function UserActionModal({ user, onClose, onSave }) {
  const [tab, setTab] = useState(0);

  if (!user) return null;

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
