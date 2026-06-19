import React, { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { LaptopIcon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { authClient } from "../../lib/auth-client";
import toast from "react-hot-toast";

export default function ActiveDevices() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await authClient.listSessions();
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
    if (ua.includes("Mobi") || ua.includes("Android") || ua.includes("iPhone")) {
      return { name: "Mobile Device", icon: SmartPhone01Icon };
    }
    if (ua.includes("Windows")) return { name: "Windows PC", icon: LaptopIcon };
    if (ua.includes("Mac")) return { name: "Mac", icon: LaptopIcon };
    return { name: "Desktop", icon: LaptopIcon };
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm h-fit">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Active Devices</h2>
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
                    <HugeiconsIcon icon={device.icon} className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{device.name}</p>
                    <p className="text-xs text-gray-500">IP: {session.ipAddress || "Unknown"}</p>
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
  );
}
