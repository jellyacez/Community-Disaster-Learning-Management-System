import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Layers01Icon, Search01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default function BarangayTenancyMatrix({ barangays }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return barangays.filter((b) => b.toLowerCase().includes(search.toLowerCase()));
  }, [barangays, search]);

  const handleScope = (barangayName) => {
    sessionStorage.setItem("super_admin_active_scope", barangayName);
    navigate("/admin/barangay/dashboard");
  };

  return (
    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Layers01Icon} className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Barangay Tenancy Matrix</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            View or inspect barangay registry for any sector
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <HugeiconsIcon
            icon={Search01Icon}
            className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search barangay..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
        {filtered.map((barangay) => (
          <div
            key={barangay}
            className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800/80 hover:border-red-200 dark:hover:border-red-900/40 transition flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 dark:text-slate-200 truncate">{barangay}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active" />
            </div>

            <div className="mt-4 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800/50">
              <span className="text-[10px] font-mono text-gray-400 dark:text-slate-500">Bacolor, PAM</span>
              <button
                onClick={() => handleScope(barangay)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:text-red-700 transition cursor-pointer"
              >
                <span>Scope</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}