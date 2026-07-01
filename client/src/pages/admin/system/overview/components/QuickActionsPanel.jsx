import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings02Icon, Download01Icon } from "@hugeicons/core-free-icons";

export default function QuickActionsPanel({ settingsData }) {
  const queryClient = useQueryClient();
  const isMaintenanceMode = settingsData?.maintenance_mode === "true";

  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (enabled) => {
      const res = await apiClient.patch("/admin/settings/maintenance", { enabled });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Maintenance mode updated.");
      // Invalidate settings to refresh the UI immediately
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: () => {
      toast.error("Failed to update maintenance mode.");
    },
  });

  const handleToggleMaintenance = () => {
    // If it's currently true, we want to set it to false, and vice versa
    toggleMaintenanceMutation.mutate(!isMaintenanceMode);
  };

  const handleExportLogs = () => {
    toast.success("System logs exported successfully! (Placeholder)");
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={handleToggleMaintenance}
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
  );
}
