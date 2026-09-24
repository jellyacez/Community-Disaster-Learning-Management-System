import { useState } from "react";
import ConfirmationModal from "../../../../../../components/ui/modals/ConfirmationModal";

export default function DeactivateArchiveTab({ user, onSave }) {
  const [banReason, setBanReason] = useState("");
  const [modalConfig, setModalConfig] = useState({ isOpen: false, action: null });

  const handleBanSubmit = (e) => {
    e.preventDefault();
    const actionName = user.banned ? "reactivate" : "deactivate";
    setModalConfig({ isOpen: true, action: actionName });
  };

  const handleArchive = () => {
    const actionName = user.archived ? "restore" : "archive";
    setModalConfig({ isOpen: true, action: actionName });
  };

  const confirmAction = async () => {
    const actionName = modalConfig.action;
    setModalConfig({ isOpen: false, action: null });
    
    if (actionName === "deactivate") {
      await onSave({ type: "ban", userId: user.id, data: { reason: banReason } });
    } else if (actionName === "reactivate") {
      await onSave({ type: "unban", userId: user.id });
    } else if (actionName === "archive" || actionName === "restore") {
      await onSave({ type: "archive", userId: user.id, data: { archived: actionName === "archive" } });
    } else if (actionName === "hard_delete") {
      await onSave({ type: "hard_delete", userId: user.id, data: { confirm: true } });
    }
  };

  return (
    <>
      <div className="space-y-4 pb-2">
        {/* Ban / Unban */}
        <form onSubmit={handleBanSubmit} className="p-5 rounded-2xl border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-red-900 dark:text-red-300">
                {user.banned ? "This account is currently deactivated" : "Deactivate this account"}
              </p>
              {user.banReason && (
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">Reason: {user.banReason}</p>
              )}
            </div>
          </div>
          {!user.banned && (
            <div>
              <label className="block text-xs font-semibold text-red-800 dark:text-red-300 mb-1">Deactivation Reason</label>
              <input
                type="text"
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                placeholder="Enter reason for deactivation..."
                className="w-full px-3 py-2 border border-red-200 dark:border-red-800/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-900 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>
          )}
          <button
            type="submit"
            className={`w-full rounded-xl py-2.5 text-sm font-bold transition-colors cursor-pointer ${
              user.banned
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            {user.banned ? "Reactivate Account" : "Deactivate Account"}
          </button>
        </form>

        {/* Archive / Restore */}
        <div className={`p-5 rounded-2xl border space-y-3 ${user.archived ? "border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30" : "border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-bold ${user.archived ? "text-emerald-900 dark:text-emerald-300" : "text-gray-900 dark:text-slate-100"}`}>
                {user.archived ? "Account is archived" : "Archive this account"}
              </p>
              <p className={`text-xs mt-0.5 ${user.archived ? "text-emerald-700 dark:text-emerald-400" : "text-gray-500 dark:text-slate-400"}`}>
                {user.archived ? "Restore to allow login." : "Soft-delete to block access."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleArchive}
            className={`w-full rounded-xl py-2.5 text-sm font-bold transition-colors cursor-pointer ${
              user.archived
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600"
            }`}
          >
            {user.archived ? "Restore Account" : "Archive Account"}
          </button>
        </div>

        {/* Hard Delete */}
        <div className="p-5 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-red-900 dark:text-red-300">
                Permanently Delete Account
              </p>
              <p className="text-xs mt-0.5 text-red-700 dark:text-red-400">
                This action is irreversible. It will purge all data for this user.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalConfig({ isOpen: true, action: "hard_delete" })}
            className="w-full rounded-xl py-2.5 text-sm font-bold transition-colors bg-red-600 text-white hover:bg-red-700 cursor-pointer"
          >
            Permanently Delete
          </button>
        </div>
      </div>
      
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false, action: null })}
        onConfirm={confirmAction}
        title={`Confirm ${
          modalConfig.action === 'hard_delete' 
            ? 'Permanent Deletion' 
            : modalConfig.action?.charAt(0).toUpperCase() + modalConfig.action?.slice(1)
        }`}
        description={
          modalConfig.action === 'hard_delete'
            ? `Are you sure you want to permanently delete this account? This action cannot be undone and will purge all data.`
            : `Are you sure you want to ${modalConfig.action} this account?`
        }
        confirmText={`Yes, ${modalConfig.action === 'hard_delete' ? 'Delete' : modalConfig.action}`}
        cancelText="Cancel"
        type={modalConfig.action === 'deactivate' || modalConfig.action === 'archive' || modalConfig.action === 'hard_delete' ? 'danger' : 'warning'}
      />
    </>
  );
}
