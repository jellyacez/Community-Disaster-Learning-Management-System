import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

export default function SystemAlertBanner({ healthData }) {
  if (!healthData) return null;

  const isDisconnected = healthData.db_status !== "connected";
  
  // Use percentage threshold if available, otherwise fallback to absolute MB
  const isHighMemory = healthData.memory_usage_percent 
    ? healthData.memory_usage_percent > 80 
    : healthData.memory_usage_mb > 1024;

  if (!isDisconnected && !isHighMemory) return null;

  const formattedMemoryAlert = healthData.memory_total_mb 
    ? `Server memory usage is critically high (${(healthData.memory_usage_mb / 1024).toFixed(1)} GB / ${(healthData.memory_total_mb / 1024).toFixed(1)} GB - ${healthData.memory_usage_percent}%). Restart recommended.`
    : `Server memory usage is critically high (${healthData.memory_usage_mb} MB). Restart recommended.`;

  return (
    <div className="relative overflow-hidden bg-red-50 border border-red-100 border-l-4 border-l-red-500 rounded-xl p-5 flex items-start gap-4 shadow-md mb-6 transition-all">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-red-500 opacity-10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="mt-0.5 text-red-600 bg-red-100 p-2 rounded-full relative shrink-0">
        <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-30"></div>
        <HugeiconsIcon icon={Alert02Icon} className="w-6 h-6 relative z-10" />
      </div>
      
      <div className="relative z-10">
        <h3 className="text-base font-extrabold text-red-900 tracking-tight">Critical System Alert</h3>
        <div className="mt-1.5 text-sm font-medium text-red-800 flex flex-col gap-2">
          {isDisconnected && (
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span> 
              Database connection has been lost. System is currently degraded.
            </p>
          )}
          {isHighMemory && (
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span> 
              {formattedMemoryAlert}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
