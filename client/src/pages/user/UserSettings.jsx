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
    <div className="animate-in fade-in duration-300 w-full pb-12">
      <div className="mb-8 px-1">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Account Settings</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage your personal information, security preferences, and active devices.
        </p>
      </div>

      <div className="space-y-10">
        
        {/* Group 1: Account Preferences */}
        <section>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 px-1">Account Preferences</h3>
          <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
            <ProfilePreferences currentUser={currentUser} />
            <LocalizationSettings />
          </div>
        </section>

        {/* Group 2: Security & Activity */}
        <section>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 px-1">Security & Activity</h3>
          <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
            <SecuritySettings />
            <TwoFactorSettings />
            <ActiveDevices />
            <LoginHistory />
          </div>
        </section>

        {/* Group 3: Communications & Help */}
        <section>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 px-1">Communications & Help</h3>
          <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
            <NotificationPreferences />
            <HelpSupport />
          </div>
        </section>

        {/* Group 4: Danger Zone */}
        <section>
          <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4 px-1">Danger Zone</h3>
          <DangerZone />
        </section>

      </div>
    </div>
  );
}
// --- END: UserSettings.jsx ---
