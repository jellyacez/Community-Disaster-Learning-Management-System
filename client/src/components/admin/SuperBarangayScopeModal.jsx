import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { authClient } from "../../lib/auth-client";
import apiClient from "../../lib/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building03Icon, Exchange01Icon } from "@hugeicons/core-free-icons";

export default function SuperBarangayScopeModal() {
  const { data: session } = authClient.useSession();
  const location = useLocation();

  const isSuperAdmin = session?.user?.role === "super_admin";
  const isBarangayRoute = location.pathname.startsWith("/admin/barangay");

  const [barangays, setBarangays] = useState([]);
  const [selectedId, setSelectedId] = useState(() => {
    return localStorage.getItem("super_admin_barangay_scope") || "";
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    apiClient
      .get("/public/barangays")
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setBarangays(list);
      })
      .catch((err) => console.error("Failed to load barangays", err));
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin && isBarangayRoute && !selectedId) {
      setIsOpen(true);
    }
  }, [isSuperAdmin, isBarangayRoute, selectedId]);

  if (!isSuperAdmin || !isBarangayRoute) return null;

  const currentBarangayName =
    barangays.find((b) => String(b.id || b.barangay_id) === String(selectedId))?.name ||
    "Select a Barangay";

  const handleSelect = (id) => {
    setSelectedId(id);
    localStorage.setItem("super_admin_barangay_scope", id);
    setIsOpen(false);
    window.location.reload();
  };

  return (
    <>
      {/* Light & Dark Adaptive Scope Switcher Bar */}
      <div className="mb-6 flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
            <HugeiconsIcon icon={Building03Icon} className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold block">
              Super Admin Active Scope
            </span>
            <span className="text-base font-bold text-gray-900 dark:text-white">
              {currentBarangayName}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-gray-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
        >
          <HugeiconsIcon icon={Exchange01Icon} className="w-4 h-4 text-red-600 dark:text-red-400" />
          Switch Barangay
        </button>
      </div>

      {/* Modal Popup */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-2xl transition-colors duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl">
                <HugeiconsIcon icon={Building03Icon} className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Target Barangay Scope
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Select a barangay to view its local dashboard and rosters.
                </p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 my-4 pr-1">
              {barangays.map((b) => {
                const bId = String(b.id || b.barangay_id);
                const isCurrent = bId === String(selectedId);
                return (
                  <button
                    key={bId}
                    onClick={() => handleSelect(bId)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${
                      isCurrent
                        ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-900/50"
                        : "hover:bg-gray-100 dark:hover:bg-slate-800/70 text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    <span>{b.name}</span>
                    {isCurrent && (
                      <span className="text-xs text-red-600 dark:text-red-400 font-bold">Active</span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedId && (
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 text-sm font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}