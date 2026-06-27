import React from 'react';

export default function DangerZone() {
  return (
    <section className="rounded-3xl border border-red-200 bg-red-50/40 p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-red-700">Danger Zone</h2>
          <p className="text-sm font-medium text-red-600/80">Proceed with caution. These actions are permanent.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-red-100 rounded-xl shadow-sm hover:border-red-300 transition">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Request Data Export</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">Download a copy of your learning history, certificates, and personal data in JSON format.</p>
          </div>
          <button className="whitespace-nowrap rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition">
            Export Data
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-red-100 rounded-xl shadow-sm hover:border-red-300 transition">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Deactivate Account</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">Permanently disable your account and delete your data from the LMS system.</p>
          </div>
          <button className="whitespace-nowrap rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 shadow-sm transition">
            Deactivate
          </button>
        </div>
      </div>
    </section>
  );
}
