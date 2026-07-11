import { useState } from "react";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import apiClient from "../../../../../lib/apiClient";

export default function GlobalSessionControlPanel() {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForceLogout = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.post("/admin/security/force-logout-all");
      toast.success(res.data.message || "All active user sessions have been terminated.");
      setIsConfirming(false);
    } catch {
      toast.error("Failed to terminate sessions.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 shrink-0">
              <HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Global Session Control</h2>
              <p className="text-xs text-gray-500 mt-1 max-w-lg">
                Instantly invalidate all active user sessions across the platform. Users will be forced to log in again immediately. Use only in the event of a suspected system-wide breach.
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setIsConfirming(true)}
            className="w-full md:w-auto px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors shrink-0"
          >
            Force Logout All Users
          </button>
        </div>
      </div>

      {isConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <HugeiconsIcon icon={Alert01Icon} className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              Terminate All Sessions?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This action cannot be undone. All residents, module authors, and other admins will be immediately logged out.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsConfirming(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleForceLogout}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
