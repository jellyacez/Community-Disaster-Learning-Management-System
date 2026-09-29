import { useState } from "react";
import apiClient from "../../lib/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserCheck01Icon, Logout03Icon } from "@hugeicons/core-free-icons";

export default function ImpersonationBanner() {
  const [impersonatingUser] = useState(() => {
    try {
      const stored =
        sessionStorage.getItem("impersonated_target_user") ||
        localStorage.getItem("impersonated_target_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  if (!impersonatingUser) return null;

  const handleStopImpersonating = async () => {
    try {
      await apiClient.post("/admin/super/stop-impersonating");
    } catch (err) {
      console.error("Failed to stop impersonating on server", err);
    } finally {
      sessionStorage.removeItem("impersonated_target_user");
      localStorage.removeItem("impersonated_target_user");
      window.location.href = "/admin/super/dashboard";
    }
  };

  const displayName = impersonatingUser.name || impersonatingUser.email;
  const roleDisplay = (impersonatingUser.role || "RESIDENT").replace(/_/g, " ").toUpperCase();

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] max-w-[95vw] sm:max-w-2xl animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-3 sm:gap-4 px-4 py-2.5 bg-amber-500 text-slate-950 font-medium rounded-full shadow-2xl border border-amber-400 ring-2 ring-amber-500/20 backdrop-blur-md">
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-40"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
          </span>
          <HugeiconsIcon icon={UserCheck01Icon} className="w-4 h-4 text-slate-950" />
        </div>

        <div className="text-xs sm:text-sm font-semibold truncate leading-tight">
          <span className="text-slate-900/80 mr-1.5 hidden sm:inline">Masquerading as</span>
          <span className="text-slate-950 font-bold underline decoration-slate-950/30 underline-offset-2">
            {displayName}
          </span>
          <span className="ml-2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-slate-950/15 text-slate-950 rounded-full">
            {roleDisplay}
          </span>
        </div>

        <button
          onClick={handleStopImpersonating}
          className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-amber-400 text-xs font-bold rounded-full shadow-sm cursor-pointer transition-all duration-150 active:scale-95"
        >
          <HugeiconsIcon icon={Logout03Icon} className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </div>
    </div>
  );
}