import React from "react";
import { useOutletContext } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";

export default function UserSettings() {
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
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              Profile Preferences
            </h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Display Name
                </label>
                <input
                  type="text"
                  defaultValue={currentUser.name}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-red-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  defaultValue={currentUser.email}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-red-400"
                />
              </div>
              <button className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition">
                Save Changes
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Security</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-red-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-red-400"
                />
              </div>
              <button className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
