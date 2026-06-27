import React, { useState } from 'react';

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
    <section className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
          <p className="text-sm text-gray-500">Manage how we contact you.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">System Announcements</h3>
            <p className="text-xs text-gray-500 mt-1">Notify me about new Bacolor municipality announcements.</p>
          </div>
          <ToggleSwitch enabled={announcements} onChange={setAnnouncements} />
        </div>
        <hr className="border-gray-100" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Module Reminders</h3>
            <p className="text-xs text-gray-500 mt-1">Email me if I haven't finished an active module in 7 days.</p>
          </div>
          <ToggleSwitch enabled={reminders} onChange={setReminders} />
        </div>
        <hr className="border-gray-100" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Emergency Alerts</h3>
            <p className="text-xs text-gray-500 mt-1">Receive active disaster warnings (Locked for safety).</p>
          </div>
          <ToggleSwitch enabled={true} onChange={() => {}} disabled={true} />
        </div>
      </div>
    </section>
  );
}
