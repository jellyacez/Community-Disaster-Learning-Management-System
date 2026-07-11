import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings02Icon, Download01Icon, Alert01Icon, Database01Icon } from "@hugeicons/core-free-icons";
import ConfirmationModal from "../../../../../components/ui/modals/ConfirmationModal";
import useInfrastructureOperations from "../../hooks/useInfrastructureOperations";

export default function QuickActionsPanel({ settingsData }) {
  const queryClient = useQueryClient();
  const isMaintenanceMode = settingsData?.maintenance_mode === "true";
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const {
    exportSystemLogs,
    isExportingLogs,
    downloadBackup,
    isDownloadingBackup,
    downloadServerLogs,
    isDownloadingServerLogs
  } = useInfrastructureOperations();

  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (enabled) => {
      const res = await apiClient.patch("/admin/settings/maintenance", { enabled });
      return res.data;
    },
    onMutate: async (enabled) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["systemSettings"] });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData(["systemSettings"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["systemSettings"], (old) => {
        if (!old) return old;
        return {
          ...old,
          maintenanceMode: enabled
        };
      });

      // Return a context object with the snapshotted value
      return { previousSettings };
    },
    onError: (err, enabled, context) => {
      // Roll back to the previous value if the mutation fails
      if (context?.previousSettings) {
        queryClient.setQueryData(["systemSettings"], context.previousSettings);
      }
      toast.error(
        err.response?.data?.error || "Failed to toggle Maintenance Mode."
      );
      setShowConfirmModal(false);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure backend sync
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onSuccess: (data) => {
      toast.success(data.message || "Maintenance mode updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["recentLogs"] });
      setShowConfirmModal(false);
    },
  });

  const confirmToggle = () => {
    toggleMaintenanceMutation.mutate(!isMaintenanceMode);
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

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmToggle}
        isLoading={toggleMaintenanceMutation.isLoading}
        title={isMaintenanceMode ? "Disable Maintenance Mode?" : "Enable Maintenance Mode?"}
        description={isMaintenanceMode
          ? "The platform will become accessible to all residents again."
          : "Are you sure you want to activate maintenance mode? All active student sessions will be disconnected."}
        confirmText="Confirm"
        type={isMaintenanceMode ? "success" : "danger"}
      />
      
      <ConfirmationModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={() => exportSystemLogs(() => setShowExportModal(false))}
        isLoading={isExportingLogs}
        title="Export System Logs?"
        description="This will download a comprehensive CSV file containing all system activity logs for auditing purposes."
        confirmText="Export CSV"
        type="warning"
      />

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
