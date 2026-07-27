import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";

export default function MdrrmoAlertBanner() {
  return (
    <div className="relative overflow-hidden bg-emerald-50 border border-emerald-100 border-l-4 border-l-emerald-500 rounded-xl p-5 flex items-start gap-4 shadow-sm transition-all">
      <div className="mt-0.5 text-emerald-600 bg-emerald-100 p-2 rounded-full relative shrink-0">
        <HugeiconsIcon icon={Alert01Icon} className="w-6 h-6 relative z-10" />
      </div>
      
      <div className="relative z-10 flex flex-col justify-center pt-1">
        <h3 className="text-base font-extrabold text-emerald-900 tracking-tight uppercase">System Status: NORMAL / READY</h3>
        <p className="mt-0.5 text-sm font-medium text-emerald-700">
          The MDRRM Hub is fully operational and receiving updates.
        </p>
      </div>
    </div>
  );
}
