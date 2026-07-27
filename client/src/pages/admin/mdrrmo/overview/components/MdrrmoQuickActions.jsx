import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Download01Icon } from "@hugeicons/core-free-icons";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function MdrrmoQuickActions() {
  const exportReports = () => {
    // Placeholder for actual report export logic
    toast.success("Training reports export started.");
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
      </div>
      
      <div className="space-y-3 flex-1 flex flex-col justify-center">
        <Link
          to="/admin/mdrrmo/modules"
          className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={PlusSignIcon} className="w-5 h-5" />
            <span className="text-sm font-semibold">Create New Module</span>
          </div>
        </Link>

        <button
          onClick={exportReports}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Download01Icon} className="w-5 h-5" />
            <div className="text-left">
              <div className="text-sm font-semibold">Export Training Reports</div>
              <div className="text-xs text-gray-500 font-medium hidden sm:block">Download resident progress CSV</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
