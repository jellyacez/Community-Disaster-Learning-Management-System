import React, { useState } from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import { Megaphone01Icon, Alert02Icon, Notification03Icon } from "@hugeicons/core-free-icons";

function ToggleSwitch({ enabled, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      className={`${enabled ? 'bg-red-600' : 'bg-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2`}
    >
      <span className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
  );
}

export default function NotificationPreferences() {
  const [announcements, setAnnouncements] = useState(true);
  const [reminders, setReminders] = useState(true);

  return (
    <div className="p-6 md:p-8 w-full flex flex-col space-y-2">
      
      {/* System Announcements Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors group">
        <div className="md:w-1/3 flex-shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={Megaphone01Icon} className="w-5 h-5 text-red-500" />
            System Announcements
          </h4>
          <p className="text-sm text-gray-500 mt-1">Notify me about new Bacolor municipality announcements.</p>
        </div>
        <div className="md:w-2/3 max-w-md flex items-center justify-end">
          <ToggleSwitch enabled={announcements} onChange={setAnnouncements} />
        </div>
      </div>

      {/* Disaster Alerts Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors group">
        <div className="md:w-1/3 flex-shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-500" />
            Disaster Alerts
          </h4>
          <p className="text-sm text-gray-500 mt-1">Receive active disaster warnings <span className="text-red-500">(Locked for safety)</span>.</p>
        </div>
        <div className="md:w-2/3 max-w-md flex items-center justify-end">
          <ToggleSwitch enabled={true} disabled={true} />
        </div>
      </div>

      {/* Module Reminders Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors group">
        <div className="md:w-1/3 flex-shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={Notification03Icon} className="w-5 h-5 text-red-500" />
            Module Reminders
          </h4>
          <p className="text-sm text-gray-500 mt-1">Get reminders for incomplete learning modules.</p>
        </div>
        <div className="md:w-2/3 max-w-md flex items-center justify-end">
          <ToggleSwitch enabled={reminders} onChange={setReminders} />
        </div>
      </div>

    </div>
  );
}
