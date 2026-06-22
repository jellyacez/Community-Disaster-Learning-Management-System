import React from "react";
import { useOutletContext } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import ProfilePreferences from "../../components/settings/ProfilePreferences";
import SecuritySettings from "../../components/settings/SecuritySettings";
import ActiveDevices from "../../components/settings/ActiveDevices";
import TwoFactorSettings from "../../components/settings/TwoFactorSettings";

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full max-w-full overflow-hidden px-1">
        <div className="lg:col-span-7 space-y-6 flex flex-col w-full">
          <ProfilePreferences currentUser={currentUser} />
          <ActiveDevices />
        </div>
        <div className="lg:col-span-5 space-y-6 flex flex-col w-full">
          <SecuritySettings />
          <TwoFactorSettings />
        </div>
      </div>
    </div>
  );
}
