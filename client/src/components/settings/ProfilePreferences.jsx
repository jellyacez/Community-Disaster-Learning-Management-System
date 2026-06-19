import React from "react";

export default function ProfilePreferences({ currentUser }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">Profile Preferences</h2>
      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Display Name
          </label>
          <input
            type="text"
            defaultValue={currentUser?.name}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-red-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 flex items-center gap-2">
            Email Address{" "}
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold">
              Uneditable
            </span>
          </label>
          <input
            type="email"
            value={currentUser?.email}
            disabled
            readOnly
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Your email address cannot be changed for security reasons.
          </p>
        </div>
        <button className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition">
          Save Changes
        </button>
      </div>
    </div>
  );
}
