import useDocumentTitle from "../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";

export default function LiveAlerts() {
  useDocumentTitle("System Announcements | DRRM Bacolor");

  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            System Announcements
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Broadcast educational updates, new module availability, and system notices.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 p-16 shadow-sm">
          <div className="h-20 w-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
            <HugeiconsIcon icon={Notification01Icon} className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Module Under Construction</h2>
          <p className="mt-2 text-gray-500 max-w-md text-center">
            The announcement broadcasting system is currently being developed. 
            Check back later to send system-wide educational notices to residents.
          </p>
        </div>
      </div>
    </div>
  );
}
