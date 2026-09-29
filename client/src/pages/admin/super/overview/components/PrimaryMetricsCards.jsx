import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserMultiple02Icon,
  Building03Icon,
  Alert02Icon,
  GraduationCapIcon,
} from "@hugeicons/core-free-icons";

export default function PrimaryMetricsCards({ stats, loading, totalBarangaysCount }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Accounts */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm hover:border-gray-200 dark:hover:border-slate-700 transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Total Accounts</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {loading
                ? "..."
                : stats?.total_users ??
                  stats?.totalUsers ??
                  stats?.users ??
                  stats?.total_accounts ??
                  stats?.user_count ??
                  0}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">Platform-wide registrations</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <HugeiconsIcon icon={UserMultiple02Icon} className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Trained Citizens */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm hover:border-gray-200 dark:hover:border-slate-700 transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Trained Citizens</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {loading
                ? "..."
                : stats?.totalCertificates ??
                  stats?.total_certificates ??
                  stats?.certificates_issued ??
                  stats?.certified_responders ??
                  stats?.trainedCount ??
                  0}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Completed DRRM certification/s</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
            <HugeiconsIcon icon={GraduationCapIcon} className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm hover:border-gray-200 dark:hover:border-slate-700 transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Active Alerts</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {loading ? "..." : stats?.activeAlerts ?? stats?.active_alerts ?? 0}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">MDRRMO broadcast feed clear</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <HugeiconsIcon icon={Alert02Icon} className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Active Barangays */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm hover:border-gray-200 dark:hover:border-slate-700 transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Barangays Active</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {loading ? "..." : stats?.totalBarangays ?? stats?.total_barangays ?? totalBarangaysCount}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">Municipality of Bacolor</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <HugeiconsIcon icon={Building03Icon} className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}