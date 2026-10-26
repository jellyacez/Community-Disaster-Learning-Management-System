import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

export default function PlatformTelemetry() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Platform Telemetry</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Live infrastructure status</p>
      </div>

      <div className="space-y-3">
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">PostgreSQL Connection</p>
              <p className="text-[10px] text-gray-400">Direct Pool Client</p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">HEALTHY</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Auth Middleware</p>
              <p className="text-[10px] text-gray-400">Better-Auth Engine</p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">ACTIVE</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">MFA Enforcement</p>
              <p className="text-[10px] text-gray-400">Admin accounts tier</p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">ENFORCED</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Impersonation State</p>
              <p className="text-[10px] text-gray-400">Dual-cookie session hook</p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">ENABLED</span>
        </div>
      </div>

      <div className="pt-2">
        <Link
          to="/admin/super/security"
          className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-900 dark:text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4 text-emerald-500" />
          <span>Open Security Dashboard</span>
        </Link>
      </div>
    </div>
  );
}