import { useState } from "react";

export default function DeactivateArchiveTab({ user, onSave }) {
  const [banReason, setBanReason] = useState("");

  const handleBanSubmit = (e) => {
    e.preventDefault();
    const actionName = user.banned ? "reactivate" : "deactivate";
    if (window.confirm(`Are you sure you want to ${actionName} this account?`)) {
      if (!user.banned) {
        onSave({ type: "ban", userId: user.id, data: { reason: banReason } });
      } else {
        onSave({ type: "unban", userId: user.id });
      }
    }
  };

  const handleArchive = async () => {
    const actionName = user.archived ? "restore" : "archive";
    if (window.confirm(`Are you sure you want to ${actionName} this account?`)) {
      await onSave({ type: "archive", userId: user.id, data: { archived: !user.archived } });
    }
  };

  return (
    <div className="space-y-4 pb-2">
      {/* Ban / Unban */}
      <form onSubmit={handleBanSubmit} className="p-5 rounded-2xl border border-red-100 bg-red-50 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-red-900">
              {user.banned ? "This account is currently deactivated" : "Deactivate this account"}
            </p>
            {user.banReason && (
              <p className="text-xs text-red-700 mt-0.5">Reason: {user.banReason}</p>
            )}
          </div>
        </div>
        {!user.banned && (
          <div>
            <label className="block text-xs font-semibold text-red-800 mb-1">Deactivation Reason</label>
            <input
              type="text"
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              placeholder="Enter reason for deactivation..."
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
          {user.banned ? "Reactivate Account" : "Deactivate Account"}
        </button>
      </form>

      {/* Archive / Restore */}
      <div className={`p-5 rounded-2xl border space-y-3 ${user.archived ? "border-emerald-100 bg-emerald-50" : "border-gray-100 bg-gray-50"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-bold ${user.archived ? "text-emerald-900" : "text-gray-900"}`}>
              {user.archived ? "Account is archived" : "Archive this account"}
            </p>
            <p className={`text-xs mt-0.5 ${user.archived ? "text-emerald-700" : "text-gray-500"}`}>
              {user.archived ? "Restore to allow login." : "Soft-delete to block access."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleArchive}
          className={`w-full rounded-xl py-2.5 text-sm font-bold transition-colors ${
            user.archived
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {user.archived ? "Restore Account" : "Archive Account"}
        </button>
      </div>
    </div>
  );
}
