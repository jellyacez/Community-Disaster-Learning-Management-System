import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Logout01Icon } from "@hugeicons/core-free-icons";

export default function LogoutModal({ isOpen, onClose, onConfirm, unsyncedCount = 0, isSyncing = false }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/60 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 p-8 shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
          >
            <button
              onClick={onClose}
              className="absolute right-5 top-5 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} className="w-6 h-6" />
            </button>

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              <HugeiconsIcon aria-hidden="true" icon={Logout01Icon} className="w-8 h-8 translate-x-1" />
            </div>

            <h2 id="logout-modal-title" className="text-center text-2xl font-extrabold text-gray-900 dark:text-white">
              Confirm Logout
            </h2>
            <p className="mt-2 text-center text-sm text-gray-500 dark:text-slate-400">
              Are you sure you want to log out of your account? You will need to sign in again to access the portal.
            </p>

            {unsyncedCount > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                You have {unsyncedCount} unsynced {unsyncedCount === 1 ? "change" : "changes"}.{" "}
                {typeof navigator !== "undefined" && navigator.onLine
                  ? "We'll try to sync them before logging you out."
                  : "You're offline, so they stay on this device and sync the next time you sign in to this account with a connection."}
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-gray-100 dark:bg-slate-800 px-5 py-3 text-sm font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isSyncing}
                className="flex-1 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSyncing ? "Syncing..." : unsyncedCount > 0 ? "Logout anyway" : "Logout"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
