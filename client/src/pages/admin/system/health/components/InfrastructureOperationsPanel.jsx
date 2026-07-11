import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Database01Icon, Download01Icon, Alert01Icon } from "@hugeicons/core-free-icons";
import ConfirmationModal from "../../../../../components/ui/modals/ConfirmationModal";
import useInfrastructureOperations from "../../hooks/useInfrastructureOperations";

export default function InfrastructureOperationsPanel() {
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const {
    downloadBackup,
    isDownloadingBackup,
    downloadServerLogs,
    isDownloadingServerLogs
  } = useInfrastructureOperations();

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-bold text-gray-900">Infrastructure Operations</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4 flex-1 w-full">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={Database01Icon} className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">Manual Database Backup</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  Generate and download a full SQL dump of the current PostgreSQL database. This includes all schemas, tables, and records.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBackupModal(true)}
              disabled={isDownloadingBackup}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isDownloadingBackup ? (
                <svg className="animate-spin w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
              )}
              {isDownloadingBackup ? "Generating Backup..." : "Download SQL Backup"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4 flex-1 w-full">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={Alert01Icon} className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">Export Server Error Logs</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  Download the raw Node.js runtime logs (.log) to diagnose API failures, uncaught exceptions, and console errors.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLogsModal(true)}
              disabled={isDownloadingServerLogs}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isDownloadingServerLogs ? (
                <svg className="animate-spin w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
              )}
              {isDownloadingServerLogs ? "Downloading..." : "Download .log File"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        onConfirm={() => downloadBackup(() => setShowBackupModal(false))}
        isLoading={isDownloadingBackup}
        title="Download Database Backup?"
        description="This will generate and download a complete SQL dump of the PostgreSQL database, including all schemas and records."
        confirmText="Download SQL"
        type="warning"
      />

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
