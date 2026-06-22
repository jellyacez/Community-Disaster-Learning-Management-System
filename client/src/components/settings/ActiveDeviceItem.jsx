import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { getDeviceDetails } from "../../utils/deviceUtils";

export default function ActiveDeviceItem({ session, isCurrent, onSignOut, isOnlySession }) {
  const device = getDeviceDetails(session.userAgent);

  const getBrowser = (ua) => {
    if (!ua) return "Unknown Browser";
    if (ua.includes("Edg")) return "Edge";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    return "Browser";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(',', ' at');
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-4">
        <div className="pt-1 text-gray-500">
          <HugeiconsIcon icon={device.icon} className="w-6 h-6" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            {device.name} • {session.ipAddress || "Unknown Location"}
            {isCurrent && (
              <span className="text-[10px] uppercase tracking-wider font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                This Device
              </span>
            )}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {getBrowser(session.userAgent)}
            {isCurrent ? (
              <>
                {" • "}
                <span className="text-green-600 font-medium">Active now</span>
              </>
            ) : (
              ` • ${formatDate(session.updatedAt || session.createdAt)}`
            )}
          </p>
        </div>
      </div>
      {!isOnlySession && (
        <button
          onClick={() => onSignOut(session.token)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
        >
          Sign Out
        </button>
      )}
    </div>
  );
}
