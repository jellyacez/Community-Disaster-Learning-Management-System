import { HugeiconsIcon } from "@hugeicons/react";
import { CustomerSupportIcon } from "@hugeicons/core-free-icons";

export default function HelpSupport() {
  return (
    <div className="p-6 md:p-8 w-full flex flex-col space-y-2">
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors group">
        <div className="md:w-1/3 shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={CustomerSupportIcon} className="w-5 h-5 text-red-500" />
            Help & Support
          </h4>
          <p className="text-sm text-gray-500 mt-1">Need assistance? Reach out to our local support team for help with your account or learning modules.</p>
        </div>
        <div className="md:w-2/3 max-w-md flex justify-end items-start">
          <button className="flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm transition-colors">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
