import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings02Icon, Download01Icon, Alert01Icon, Database01Icon } from "@hugeicons/core-free-icons";

export default function QuickActionsPanel({ settingsData }) {
  const queryClient = useQueryClient();
  const isMaintenanceMode = settingsData?.maintenance_mode === "true";
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (enabled) => {
      const res = await apiClient.patch("/admin/settings/maintenance", { enabled });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Maintenance mode updated.");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
      setShowConfirmModal(false);
    },
    onError: () => {
      toast.error("Failed to update maintenance mode.");
      setShowConfirmModal(false);
    },
  });

  const confirmToggle = () => {
    toggleMaintenanceMutation.mutate(!isMaintenanceMode);
  };

  const handleExportLogs = () => {
    toast.promise(
      apiClient.get("/admin/activity-log/export", { responseType: "blob" })
        .then((res) => {
          const blob = new Blob([res.data], { type: "text/csv" });
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = "system_activity_logs.csv";
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);
          setShowExportModal(false);
        }),
      {
        loading: 'Exporting logs...',
        success: 'System logs exported successfully!',
        error: 'Failed to export logs.'
      }
    );
  };

  const handleDownloadBackup = async () => {
    setShowBackupModal(false);
    toast.promise(
      apiClient.get("/admin/infrastructure/backup", { responseType: "blob" })
        .then((res) => {
          const contentDisposition = res.headers['content-disposition'];
          let filename = "database_backup.sql";
          if (contentDisposition && contentDisposition.includes('filename=')) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch.length > 1) {
              filename = filenameMatch[1];
            }
          }

          const blob = new Blob([res.data], { type: "application/sql" });
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);
        }),
      {
        loading: 'Generating database backup...',
        success: 'Backup downloaded successfully!',
        error: 'Failed to generate backup.'
      }
    );
  };

  const handleDownloadLogs = async () => {
    setShowLogsModal(false);
    toast.promise(
      apiClient.get("/admin/infrastructure/logs", { responseType: "blob" })
        .then((res) => {
          const contentDisposition = res.headers['content-disposition'];
          let filename = "server_error.log";
          if (contentDisposition && contentDisposition.includes('filename=')) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch.length > 1) {
              filename = filenameMatch[1];
            }
          }

          const blob = new Blob([res.data], { type: "text/plain" });
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);
        }),
      {
        loading: 'Fetching server logs...',
        success: 'Server logs downloaded!',
        error: 'Failed to download logs.'
      }
    );
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={toggleMaintenanceMutation.isLoading}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
              isMaintenanceMode
                ? "bg-red-50 border-red-200 text-red-800 hover:bg-red-100"
                : "bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Settings02Icon} className="w-5 h-5" />
              <span className="text-sm font-semibold">
                {isMaintenanceMode ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
              </span>
            </div>
            {toggleMaintenanceMutation.isLoading && (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Download01Icon} className="w-5 h-5" />
              <span className="text-sm font-semibold">Export System Logs</span>
            </div>
          </button>
          
          <button
            onClick={() => setShowBackupModal(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Database01Icon} className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm font-semibold">Download DB Backup</div>
                <div className="text-xs text-gray-500 font-medium hidden sm:block">Export PostgreSQL data (.sql)</div>
              </div>
            </div>
            <div className="text-xs font-bold text-gray-400">DATA</div>
          </button>

          <button
            onClick={() => setShowLogsModal(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Alert01Icon} className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm font-semibold">Export Server Error Logs</div>
                <div className="text-xs text-gray-500 font-medium hidden sm:block">Download raw runtime logs (.log)</div>
              </div>
            </div>
            <div className="text-xs font-bold text-gray-400">LOGS</div>
          </button>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <HugeiconsIcon icon={Alert01Icon} className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              {isMaintenanceMode ? "Disable Maintenance Mode?" : "Enable Maintenance Mode?"}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {isMaintenanceMode
                ? "The platform will become accessible to all residents again."
                : "Are you sure you want to activate maintenance mode? All active student sessions will be disconnected."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-lg transition-colors"
                disabled={toggleMaintenanceMutation.isLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmToggle}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
                disabled={toggleMaintenanceMutation.isLoading}
              >
                {toggleMaintenanceMutation.isLoading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <HugeiconsIcon icon={Download01Icon} className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              Export System Logs?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will download a comprehensive CSV file containing all system activity logs for auditing purposes.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExportLogs}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <HugeiconsIcon icon={Database01Icon} className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              Download Database Backup?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will generate and download a complete SQL dump of the PostgreSQL database, including all schemas and records.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBackupModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadBackup}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                Download SQL
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <HugeiconsIcon icon={Alert01Icon} className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              Export Server Logs?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will securely download the raw Node.js runtime `.log` file containing system crashes and errors.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogsModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadLogs}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                Download .log
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
