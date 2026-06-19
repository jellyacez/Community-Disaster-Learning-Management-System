import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { getDeviceDetails } from "../../utils/deviceUtils";

export default function ActiveDeviceItem({ session, isCurrent, onSignOut }) {
  const device = getDeviceDetails(session.userAgent);

  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-4 ${
        isCurrent ? "border-red-100 bg-red-50/30" : "border-gray-100 bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`rounded-full p-2 shadow-sm border ${
            isCurrent
              ? "bg-white border-red-100 text-red-600"
              : "bg-white border-gray-100 text-gray-700"
          }`}
        >
          <HugeiconsIcon icon={device.icon} className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
            {device.name}
            {isCurrent && (
              <span className="text-[10px] uppercase tracking-wider font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                This Device
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            IP: {session.ipAddress || "Unknown"}
          </p>
        </div>
      </div>
      <button
        onClick={() => onSignOut(session.token)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
      >
        Sign Out
      </button>
    </div>
  );
}
