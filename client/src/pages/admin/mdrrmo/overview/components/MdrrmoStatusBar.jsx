import { HugeiconsIcon } from "@hugeicons/react";
import { Time02Icon } from "@hugeicons/core-free-icons";

export default function MdrrmoStatusBar() {
  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-sm font-extrabold text-emerald-900 tracking-wide uppercase">Operational</span>
      </div>

      <div className="flex items-center gap-6 text-[13px] font-semibold text-emerald-700">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Time02Icon} className="w-4 h-4 opacity-70" />
          <span>Last Sync: 2 minutes ago</span>
        </div>
      </div>
    </div>
  );
}
