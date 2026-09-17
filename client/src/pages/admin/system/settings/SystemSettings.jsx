import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";
import toast from "react-hot-toast";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Settings01Icon,
  Notification01Icon,
  PaintBoardIcon,
  Sun01Icon,
  Moon02Icon,
  ComputerIcon,
} from "@hugeicons/core-free-icons";

import BrandingPanel from "./components/BrandingPanel";
import BroadcastOverridePanel from "./components/BroadcastOverridePanel";
import OrganizationDetailsPanel from "./components/OrganizationDetailsPanel";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";
import { useTheme } from "../../../../hooks/context/themeContext";

export default function SystemSettings() {
  useDocumentTitle("System Settings | Admin Console");
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  const handleSetTheme = (mode) => {
    if (mode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
      localStorage.removeItem("bacolor_theme");
      return;
    }
    setTheme(mode);
  };

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/settings");
      return res.data.data;
    },
  });

  useQuery({
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
    <div className="max-w-7xl mx-auto animate-in fade-in duration-150 px-6 md:px-12 pt-2 md:pt-2 pb-12 space-y-6">
      <div className="mb-8">
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">Admin Portal</li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span className="text-gray-900 font-semibold">System Settings</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Settings</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">
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

      {/* Branding & Appearance */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 mt-8">
          Branding & Appearance
        </h2>
        
        {/* Interface Theme Switcher Card */}
        <div className="mb-6 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-slate-800">
                <HugeiconsIcon icon={PaintBoardIcon} className="w-5 h-5 text-gray-600 dark:text-slate-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Admin Interface Theme</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  Customize appearance for the administrative workspace.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-gray-100/70 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-700 w-fit">
              <button
                type="button"
                onClick={() => handleSetTheme("light")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  theme === "light"
                    ? "bg-white shadow-sm border border-gray-200/80 text-gray-900"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white"
                }`}
              >
                <HugeiconsIcon
                  icon={Sun01Icon}
                  className={`w-4 h-4 ${theme === "light" ? "text-amber-500" : "text-gray-400"}`}
                />
                Light
              </button>

              <button
                type="button"
                onClick={() => handleSetTheme("dark")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  theme === "dark"
                    ? "bg-slate-950 text-white shadow-sm border border-slate-700"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white"
                }`}
              >
                <HugeiconsIcon
                  icon={Moon02Icon}
                  className={`w-4 h-4 ${theme === "dark" ? "text-indigo-400" : "text-gray-400"}`}
                />
                Dark
              </button>

              <button
                type="button"
                onClick={() => handleSetTheme("system")}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={ComputerIcon} className="w-4 h-4 text-gray-400" />
                System
              </button>
            </div>
          </div>
        </div>

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

      <ConfirmationModal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        onConfirm={() => {
          toggleMaintenance.mutate(!maintenanceActive, {
            onSuccess: () => setShowMaintenanceModal(false)
          });
        }}
        isLoading={isToggling}
        title={maintenanceActive ? "Disable Maintenance Mode?" : "Enable Maintenance Mode?"}
        description={maintenanceActive 
          ? "This will bring the platform back online for all residents and standard users. They will be able to log in and access learning modules again." 
          : "This will instantly force all non-admin traffic to receive a 503 Service Unavailable error. Residents will see a maintenance page. Are you sure you want to proceed?"}
        confirmText={maintenanceActive ? "Go Live" : "Enable Maintenance"}
        type={maintenanceActive ? "success" : "danger"}
      />
    </div>
  );
}