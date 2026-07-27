import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import apiClient from "../../../../lib/apiClient";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { FolderAddIcon, UserGroupIcon, Certificate01Icon, Task01Icon, Download02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import StatCard from "../../system/overview/components/StatCard";
import MdrrmoStatusBar from "./components/MdrrmoStatusBar";
import { MdrrmoModuleDistributionChart, MdrrmoEnrollmentTrendChart } from "./components/MdrrmoCharts";
import ActiveModulesTable from "./components/ActiveModulesTable";
import MdrrmoRecentActivity from "./components/MdrrmoRecentActivity";

export default function Overview() {
  useDocumentTitle("MDRRMO Overview | Admin Console");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

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
      const res = await apiClient.get("admin/modules?limit=1000");
      const data = res.data.data || [];
      return data.map(mod =>({
        id: mod.mod_id,
        title: mod.modname,
        category: mod.modcat,
        status: mod.status,
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
    <div className="space-y-6 animate-in fade-in duration-150 pb-10">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)]">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Municipal Disaster Risk Reduction and Management Office</h1>
          <p className="text-[14px] text-gray-500 font-medium mt-1">Staff & Responder Training Hub</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <MdrrmoStatusBar />
          <div className="flex items-center gap-4">
          <button className="h-10 px-4 bg-white border border-gray-200 text-gray-700 text-[12px] font-bold tracking-wide uppercase rounded flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <HugeiconsIcon icon={Download02Icon} className="w-4 h-4 text-red-600" />
            Export Report
          </button>
          <Link to="/admin/mdrrmo/modules" className="h-10 px-4 bg-red-600 text-white text-[12px] font-bold tracking-wide uppercase rounded flex items-center gap-2 hover:bg-red-700 transition-colors shadow-sm">
            + Create Module
          </Link>
        </div>
        </div>
      </div>

      {/* Metrics Row (4 Columns) */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FolderAddIcon}
            label="Total Active Modules"
            value={m.active_modules}
            sub="Currently published"
            color="red"
            loading={metricsLoading}
            onClick={() => {
              setStatusFilter(statusFilter === 'published' ? null : 'published');
              setSelectedCategory(null);
            }}
            isActive={statusFilter === 'published'}
          />
          <StatCard
            icon={Task01Icon}
            label="Pending Reviews"
            value={m.pending_reviews}
            sub="Modules awaiting approval"
            color="amber"
            loading={metricsLoading}
            onClick={() => {
              setStatusFilter(statusFilter === 'pending_review' ? null : 'pending_review');
              setSelectedCategory(null);
            }}
            isActive={statusFilter === 'pending_review'}
          />
          <StatCard
            icon={UserGroupIcon}
            label="Registered Responders"
            value={m.registered_responders}
            sub="Total resident accounts"
            color="blue"
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

      {/* 2x2 Grid Layout */}
      {/* Row 2: Recent Activity & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <MdrrmoRecentActivity />
        </div>
        <div className="lg:col-span-2">
          <MdrrmoEnrollmentTrendChart />
        </div>
      </div>

      {/* Row 3: Module Distribution & Active Modules Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <MdrrmoModuleDistributionChart 
            selectedCategory={selectedCategory}
            onCategoryClick={(cat) => {
              setSelectedCategory(cat);
              setStatusFilter(null);
            }}
          />
        </div>
        <div className="lg:col-span-2">
          <ActiveModulesTable 
            modules={modules}
            selectedCategory={selectedCategory}
            statusFilter={statusFilter}
          />
        </div>
      </div>

    </div>
  );
}
