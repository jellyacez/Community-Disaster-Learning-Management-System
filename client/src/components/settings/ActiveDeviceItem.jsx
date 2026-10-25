import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { getDeviceDetails } from "../../utils/deviceUtils";

const ActiveDeviceItem = memo(function ActiveDeviceItem({ session, isCurrent, onSignOut, isOnlySession }) {
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
    <div className="flex min-w-0 flex-col items-start gap-3 py-4 border-b border-gray-100 dark:border-slate-800/80 last:border-0 transition-colors">
      <div className="flex min-w-0 w-full items-start gap-3">
        <div className="shrink-0 pt-1 text-gray-500 dark:text-slate-400">
          <HugeiconsIcon aria-hidden="true" icon={device.icon} className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-white text-sm flex flex-wrap items-center gap-2">
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{device.name} • {session.ipAddress || "Unknown Location"}</span>
            {isCurrent && (
              <span className="shrink-0 whitespace-nowrap text-[10px] uppercase tracking-wider font-bold bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                This Device
              </span>
            )}
          </p>
          <p className="break-words [overflow-wrap:anywhere] text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {getBrowser(session.userAgent)}
            {isCurrent ? (
              <>
                {" • "}
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active now</span>
              </>
            ) : (
              ` • ${formatDate(session.updatedAt || session.createdAt)}`
            )}
          </p>
        </div>
      </div>
      {!isOnlySession ? (
        <button
          onClick={() => onSignOut(session.token)}
          type="button"
          className="self-end min-h-11 shrink-0 whitespace-nowrap rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60 transition cursor-pointer"
        >
          Sign Out
        </button>
      ) : (
        <span className="self-end shrink-0 whitespace-nowrap text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/60">
          Current Session
        </span>
      )}
    </div>
  );
});

export default ActiveDeviceItem;
