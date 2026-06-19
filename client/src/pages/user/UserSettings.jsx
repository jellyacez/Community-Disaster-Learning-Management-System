import React from "react";
import { useOutletContext } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import ProfilePreferences from "../../components/settings/ProfilePreferences";
import SecuritySettings from "../../components/settings/SecuritySettings";
import ActiveDevices from "../../components/settings/ActiveDevices";

export default function UserSettings() {
  useDocumentTitle("Settings | Bacolor LMS");
  const { currentUser } = useOutletContext();

  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account preferences and system options.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <ProfilePreferences currentUser={currentUser} />
            <SecuritySettings />
          </div>
          <ActiveDevices />
        </div>
      </div>
    </div>
  );
}
