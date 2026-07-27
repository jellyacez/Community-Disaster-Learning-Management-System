import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { SkeletonTableRow } from "../../../../components/ui/Skeleton.jsx";
import { FolderAddIcon, UserGroupIcon, Certificate01Icon } from "@hugeicons/core-free-icons";

import StatCard from "../../system/overview/components/StatCard";
import MdrrmoAlertBanner from "./components/MdrrmoAlertBanner";
import MdrrmoCharts from "./components/MdrrmoCharts";
import MdrrmoQuickActions from "./components/MdrrmoQuickActions";
import MdrrmoRecentActivity from "./components/MdrrmoRecentActivity";

export default function Overview() {
  useDocumentTitle("MDRRMO Overview | Admin Console");

  const { data: metricsData, isLoading: metricsLoading, isError: metricsError, error } = useQuery({
    queryKey: ["mdrrmoMetrics"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/mdrrmo/metrics");
      return res.data.data;
    },
    refetchInterval: 30000,
    retry: 1
  });

  const { data: modules = [], isLoading: isLoadingModules } = useQuery({
    queryKey: ["adminModules"],
    queryFn: async () => {
      const res = await apiClient.get("admin/modules");
      const data = res.data.data || [];
      return data.map(mod =>({
        id: mod.mod_id,
        title:mod.modname,
        status:mod.modcat,
        step_count: parseInt(mod.step_count,10) || 0
      }));
    },
    retry: 1
  });

  if (metricsError) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100 space-y-2">
        <p className="font-bold">Error loading overview data.</p>
        <p className="text-xs bg-red-100 p-2 rounded font-mono">
          {error?.response?.data?.message || error?.message || "Unknown Connection Failure"}
        </p>
        <p className="text-sm">Please inspect your Node.js backend terminal for details.</p>
      </div>
    );
  }

  const m = metricsData || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <MdrrmoAlertBanner />

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">
          Platform Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={FolderAddIcon}
            label="Total Active Modules"
            value={m.active_modules}
            sub="Currently published"
            color="red"
            loading={metricsLoading}
          />
          <StatCard
            icon={UserGroupIcon}
            label="Registered Responders"
            value={m.registered_responders}
            sub="Total resident accounts"
            color="amber"
            loading={metricsLoading}
          />
          <StatCard
            icon={Certificate01Icon}
            label="Certificates Issued"
            value={m.certificates_issued}
            sub="Total verified certificates"
            color="green"
            loading={metricsLoading}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Side: Charts */}
        <div className="lg:col-span-2">
          <MdrrmoCharts />
        </div>

        {/* Right Side: Quick Actions */}
        <div className="lg:col-span-1 h-full">
          <MdrrmoQuickActions />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Recent Activity Feed */}
        <div className="lg:col-span-1 h-full">
          <MdrrmoRecentActivity />
        </div>

        {/* Right Side: Active Master Modules Table */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] lg:col-span-2 w-full h-full">
          <h3 className="text-base font-bold text-gray-900 mb-6">
            Active Master Modules
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-3 font-semibold uppercase tracking-wider">Module Topic</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-center">Steps Inside</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-center">Visibility</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-50">
                {isLoadingModules ? (
                  [1, 2, 3].map((i) => <SkeletonTableRow key={i} columns={3} />)
                ) : modules.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-6 text-center text-gray-400 italic">No modules available</td>
                  </tr>
                ) : (
                  modules.slice(0, 5).map((mod) => (
                    <tr key={mod.id || mod._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 font-semibold max-w-[160px] truncate text-gray-800">{mod.title}</td>
                      <td className="py-3 text-center font-mono text-gray-500 font-bold">{mod.step_count} Steps</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          mod.status === "Private" ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        }`}>
                          {mod.status || "Public"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
