import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Database01Icon,
  DatabaseRestoreIcon,
  Download01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons";
import ConfirmationModal from "../../../../../components/ui/modals/ConfirmationModal";
import useInfrastructureOperations from "../../hooks/useInfrastructureOperations";
import RestoreBackupDialog from "./RestoreBackupDialog";

export default function InfrastructureOperationsPanel() {
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [showRestore, setShowRestore] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const queryClient = useQueryClient();

  const {
    restoreBackup,
    isRestoringBackup,
    downloadBackup,
    isDownloadingBackup,
    downloadServerLogs,
    isDownloadingServerLogs,
  } = useInfrastructureOperations();

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-bold text-gray-900">
            Infrastructure Operations
          </h3>
        </div>
        <div className="@container p-5 space-y-4">
          <div className="flex flex-col @md:flex-row items-start @md:items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4 flex-1 w-full">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <HugeiconsIcon
                  icon={Database01Icon}
                  className="w-5 h-5 text-blue-600"
                />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">
                  Manual Database Backup
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  Verify your account password to download an encrypted database
                  backup. The ZIP is locked with the backup password, which is managed separately.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBackupModal(true)}
              disabled={isDownloadingBackup}
              className="w-full @md:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isDownloadingBackup ? (
                <svg
                  className="animate-spin w-4 h-4 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
              )}
              {isDownloadingBackup
                ? "Generating Backup..."
                : "Download Encrypted ZIP"}
            </button>
          </div>

          <div className="flex flex-col @md:flex-row items-start @md:items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4 flex-1 w-full">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <HugeiconsIcon
                  icon={Alert01Icon}
                  className="w-5 h-5 text-red-600"
                />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">
                  Export Server Error Logs
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  Download the raw Node.js runtime logs (.log) to diagnose API
                  failures, uncaught exceptions, and console errors.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLogsModal(true)}
              disabled={isDownloadingServerLogs}
              className="w-full @md:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isDownloadingServerLogs ? (
                <svg
                  className="animate-spin w-4 h-4 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
              )}
              {isDownloadingServerLogs
                ? "Downloading..."
                : "Download .log File"}
            </button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex flex-col @md:flex-row items-start @md:items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex items-start gap-4 flex-1 w-full">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <HugeiconsIcon
                    icon={DatabaseRestoreIcon}
                    className="w-5 h-5 text-red-600"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-900">
                    Restore Database Backup
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-md">
                    Replace all data with an encrypted backup ZIP. Requires maintenance mode.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRestore(true)}
                className="w-full @md:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors shrink-0 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <HugeiconsIcon icon={DatabaseRestoreIcon} className="w-4 h-4" />
                Restore from ZIP
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showBackupModal}
        onClose={() => {
          if (isDownloadingBackup) return;
          setShowBackupModal(false);
          setAccountPassword("");
        }}
        onConfirm={() =>
          downloadBackup(accountPassword, () => {
            setShowBackupModal(false);
            setAccountPassword("");
            queryClient.invalidateQueries({ queryKey: ["restoreStatus"] });
          })
        }
        isLoading={isDownloadingBackup}
        title="Download Database Backup?"
        description="Enter your own account password to authorize this download. The ZIP is locked with the backup password configured on the server."
        confirmText="Download ZIP"
        type="warning"
      >
        <label className="block text-sm text-gray-700 dark:text-slate-200">
          Your account password
          <input
            type="password"
            autoComplete="current-password"
            disabled={isDownloadingBackup}
            value={accountPassword}
            onChange={(e) => setAccountPassword(e.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>
      </ConfirmationModal>
      {showRestore && (
        <RestoreBackupDialog
          isRestoring={isRestoringBackup}
          onRestore={restoreBackup}
          onClose={() => setShowRestore(false)}
          onDownloadBackup={() => setShowBackupModal(true)}
          isDownloadingBackup={isDownloadingBackup}
          suspended={showBackupModal}
        />
      )}

      <ConfirmationModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        onConfirm={() => downloadServerLogs(() => setShowLogsModal(false))}
        isLoading={isDownloadingServerLogs}
        title="Export Server Logs?"
        description="This will securely download the raw Node.js runtime `.log` file containing system crashes and errors."
        confirmText="Download .log"
        type="danger"
      />
    </>
  );
}
