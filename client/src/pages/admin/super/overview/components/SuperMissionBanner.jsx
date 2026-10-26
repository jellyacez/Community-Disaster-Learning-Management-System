import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon, UserMultiple02Icon } from "@hugeicons/core-free-icons";

export default function SuperMissionBanner() {
  return (
    <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-red-800 via-red-900 to-slate-950 text-white shadow-xl relative overflow-hidden">
      <div className="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
            <HugeiconsIcon icon={Shield01Icon} className="w-9 h-9 text-red-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Super Admin Console</h1>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-red-500/30 border border-red-400/40 text-red-200 rounded-full">
                Root Privilege
              </span>
            </div>
            <p className="text-sm text-red-100/80 mt-1 max-w-xl">
              Bacolor DRRM command control telemetry, cross-barangay/agencies comparative registries, and identity delegation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/super/users"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-sm font-semibold rounded-xl border border-white/20 backdrop-blur-md shadow-sm transition flex items-center gap-2"
          >
            <HugeiconsIcon icon={UserMultiple02Icon} className="w-4 h-4 text-red-200" />
            <span>Manage Users</span>
          </Link>
        </div>
      </div>
    </div>
  );
}