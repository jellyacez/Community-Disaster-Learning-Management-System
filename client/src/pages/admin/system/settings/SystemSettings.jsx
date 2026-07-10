import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";
import toast from "react-hot-toast";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Settings01Icon,
  Notification01Icon,
} from "@hugeicons/core-free-icons";

import BrandingPanel from "./components/BrandingPanel";
import BroadcastOverridePanel from "./components/BroadcastOverridePanel";
import OrganizationDetailsPanel from "./components/OrganizationDetailsPanel";

export default function SystemSettings() {
  useDocumentTitle("System Settings | Admin Console");
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/settings");
      return res.data.data;
    },
  });

  const { data: healthData } = useQuery({
    queryKey: ["systemHealth"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/health");
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const [isToggling, setIsToggling] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const maintenanceActive = settingsData?.maintenance_mode === "true";

  const toggleMaintenance = useMutation({
    mutationFn: async (enabled) => {
      return apiClient.patch("/admin/settings/maintenance", { enabled });
    },
    onMutate: () => setIsToggling(true),
    onSettled: () => setIsToggling(false),
    onSuccess: (_, enabled) => {
      toast.success(enabled ? "Maintenance mode enabled. The platform is now paused for residents." : "Maintenance mode disabled. Platform is live.");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: () => {
      toast.error("Failed to toggle maintenance mode.");
    },
  });

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure platform appearance and global behavior for end-users.
        </p>
      </div>

      {/* Maintenance Mode — Actionable */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 mt-8">
          System State
        </h2>
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${maintenanceActive ? "border-red-200 bg-red-50" : "border-gray-100 bg-white"}`}>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${maintenanceActive ? "bg-red-100" : "bg-gray-100"}`}>
                <HugeiconsIcon icon={Settings01Icon} className={`w-5 h-5 ${maintenanceActive ? "text-red-700" : "text-gray-600"}`} />
              </div>
              <div>
                <h2 className={`text-base font-bold ${maintenanceActive ? "text-red-900" : "text-gray-900"}`}>
                  Maintenance Mode
                </h2>
                <p className={`text-sm mt-1 max-w-md ${maintenanceActive ? "text-red-700" : "text-gray-500"}`}>
                  {maintenanceActive
                    ? "The platform is currently under maintenance. All resident and module routes return 503. Admin and auth routes remain accessible."
                    : "When enabled, all non-admin API routes return a 503 response. Use during database migrations or critical infrastructure updates."}
                </p>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto mt-4 sm:mt-0">
              <button
                onClick={() => setShowMaintenanceModal(true)}
                disabled={isLoading || isToggling}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${maintenanceActive ? "bg-red-600 focus:ring-red-600" : "bg-gray-200 focus:ring-gray-900"}`}
                aria-label="Toggle maintenance mode"
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${maintenanceActive ? "translate-x-6" : "translate-x-0"}`} />
              </button>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Changes save automatically</span>
            </div>
          </div>

          {maintenanceActive && (
            <div className="mt-4 flex items-start gap-2 bg-red-100/60 rounded-xl p-3">
              <HugeiconsIcon icon={Notification01Icon} className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
              <p className="text-xs font-semibold text-red-800">
                All residents will see a maintenance page. Disable maintenance mode when your updates are complete.
              </p>
            </div>
          )}
        </div>
      </div>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 mt-8">
          Branding & Appearance
        </h2>
        <BrandingPanel settingsData={settingsData} />
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 mt-8">
          Communication & Support
        </h2>
        <div className="space-y-6">
          <OrganizationDetailsPanel settingsData={settingsData} />
          <BroadcastOverridePanel settingsData={settingsData} />
        </div>
      </div>

      {/* Maintenance Mode Confirmation Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 scale-in-95 duration-200">
            <div className={`p-6 ${maintenanceActive ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${maintenanceActive ? "bg-green-100" : "bg-red-100"}`}>
                  <HugeiconsIcon icon={Settings01Icon} className={`w-5 h-5 ${maintenanceActive ? "text-green-700" : "text-red-700"}`} />
                </div>
                <h3 className={`text-lg font-bold ${maintenanceActive ? 'text-green-900' : 'text-red-900'}`}>
                  {maintenanceActive ? "Disable Maintenance Mode?" : "Enable Maintenance Mode?"}
                </h3>
              </div>
              <p className={`mt-4 text-sm font-medium leading-relaxed ${maintenanceActive ? 'text-green-800' : 'text-red-800'}`}>
                {maintenanceActive 
                  ? "This will bring the platform back online for all residents and standard users. They will be able to log in and access learning modules again." 
                  : "This will instantly force all non-admin traffic to receive a 503 Service Unavailable error. Residents will see a maintenance page. Are you sure you want to proceed?"}
              </p>
            </div>
            <div className="p-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100">
              <button
                onClick={() => setShowMaintenanceModal(false)}
                disabled={isToggling}
                className="px-5 py-2.5 text-sm font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toggleMaintenance.mutate(!maintenanceActive, {
                    onSuccess: () => setShowMaintenanceModal(false)
                  });
                }}
                disabled={isToggling}
                className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 ${maintenanceActive ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isToggling ? "Processing..." : maintenanceActive ? "Go Live" : "Enable Maintenance"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
