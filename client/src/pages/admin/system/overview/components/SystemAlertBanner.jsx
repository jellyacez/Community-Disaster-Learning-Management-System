import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

export default function SystemAlertBanner({ healthData }) {
  if (!healthData) return null;

  const isDisconnected = healthData.db_status !== "connected";
  // Assuming > 1024MB is a high memory threshold for a typical Node.js app
  const isHighMemory = healthData.memory_usage_mb > 1024;

  if (!isDisconnected && !isHighMemory) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm mb-6">
      <div className="mt-0.5 text-red-600">
        <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-red-900">Critical System Alert</h3>
        <div className="mt-1 text-sm text-red-700 flex flex-col gap-1">
          {isDisconnected && <p>• Database connection has been lost. System is currently degraded.</p>}
          {isHighMemory && <p>• Server memory usage is critically high ({healthData.memory_usage_mb} MB). Restart recommended.</p>}
        </div>
      </div>
    </div>
  );
}
