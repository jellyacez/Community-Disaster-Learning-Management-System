import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  LaptopIcon,
  SmartPhone01Icon,
} from "@hugeicons/core-free-icons";
import { authClient } from "../../lib/auth-client";
import toast from "react-hot-toast";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function UserSettings() {
  useDocumentTitle("Settings | Bacolor LMS");
  const { currentUser } = useOutletContext();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      const { data, error } = await authClient.listSessions();
      if (data) setSessions(data);
      setLoading(false);
    };
    fetchSessions();
  }, []);

  const handleRevoke = async (token) => {
    const { error } = await authClient.revokeSession({ token });
    if (error) {
      toast.error("Failed to revoke session");
    } else {
      setSessions((prev) => prev.filter((s) => s.token !== token));
      toast.success("Device signed out successfully!");
    }
  };

  const getDeviceDetails = (ua) => {
    if (!ua) return { name: "Unknown Device", icon: LaptopIcon };
    if (
      ua.includes("Mobi") ||
      ua.includes("Android") ||
      ua.includes("iPhone")
    ) {
      return { name: "Mobile Device", icon: SmartPhone01Icon };
    }
    if (ua.includes("Windows")) return { name: "Windows PC", icon: LaptopIcon };
    if (ua.includes("Mac")) return { name: "Mac", icon: LaptopIcon };
    return { name: "Desktop", icon: LaptopIcon };
  };

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

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm h-fit">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Active Devices
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              These are the devices currently logged into your account.
            </p>

            {loading ? (
              <p className="text-sm text-gray-500">Loading devices...</p>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => {
                  const device = getDeviceDetails(session.userAgent);
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-white p-2 shadow-sm border border-gray-100">
                          <HugeiconsIcon
                            icon={device.icon}
                            className="w-5 h-5 text-gray-700"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            {device.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            IP: {session.ipAddress || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevoke(session.token)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                      >
                        Sign Out
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
