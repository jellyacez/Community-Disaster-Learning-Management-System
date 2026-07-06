import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings02Icon, Download01Icon, Alert01Icon } from "@hugeicons/core-free-icons";

export default function QuickActionsPanel({ settingsData }) {
  const queryClient = useQueryClient();
  const isMaintenanceMode = settingsData?.maintenance_mode === "true";
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
    toast.success("System logs exported successfully! (Placeholder)");
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
            onClick={handleExportLogs}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Download01Icon} className="w-5 h-5" />
              <span className="text-sm font-semibold">Export System Logs</span>
            </div>
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
    </>
  );
}
