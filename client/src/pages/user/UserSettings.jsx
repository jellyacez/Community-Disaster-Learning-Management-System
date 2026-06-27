// --- START: UserSettings.jsx ---
import React from "react";
import { useOutletContext } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import ProfilePreferences from "../../components/settings/ProfilePreferences";
import SecuritySettings from "../../components/settings/SecuritySettings";
import ActiveDevices from "../../components/settings/ActiveDevices";
import TwoFactorSettings from "../../components/settings/TwoFactorSettings";
import NotificationPreferences from "../../components/settings/NotificationPreferences";
import LocalizationSettings from "../../components/settings/LocalizationSettings";
import DangerZone from "../../components/settings/DangerZone";
import HelpSupport from "../../components/settings/HelpSupport";
import LoginHistory from "../../components/settings/LoginHistory";

export default function UserSettings() {
  useDocumentTitle("Settings | Bacolor LMS");
  const { currentUser } = useOutletContext();

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Account Settings</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage your personal information, security preferences, and active devices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch w-full max-w-full overflow-hidden px-1">
        <div className="flex flex-col space-y-6 w-full">
          <ProfilePreferences currentUser={currentUser} />
          <LocalizationSettings />
          <DangerZone />
        </div>
        <div className="flex flex-col space-y-6 w-full">
          <SecuritySettings />
          <NotificationPreferences />
          <TwoFactorSettings />
          <div className="flex-1 flex flex-col">
            <HelpSupport />
          </div>
        </div>
      </div>

      <div className="px-1 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="flex flex-col w-full">
          <ActiveDevices />
        </div>
        <div className="flex flex-col w-full">
          <LoginHistory />
        </div>
      </div>
    </div>
  );
}
// --- END: UserSettings.jsx ---
