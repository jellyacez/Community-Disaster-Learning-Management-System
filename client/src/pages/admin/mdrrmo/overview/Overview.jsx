import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import apiClient from "../../../../lib/apiClient";
import { authClient } from "../../../../lib/auth-client";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import toast from "react-hot-toast";
import {
  FolderAddIcon,
  UserGroupIcon,
  Certificate01Icon,
  Task01Icon,
  Download02Icon,
  BookOpen01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import StatCard from "../../system/overview/components/StatCard";
import ActiveModulesTable from "./components/ActiveModulesTable";
import MdrrmoRecentActivity from "./components/MdrrmoRecentActivity";
import MdrrmoQuickActions from "./components/MdrrmoQuickActions";
import AnnouncementModal from "../../barangay/workspace/announcementModal";
import { SkeletonChart } from "../../../../components/ui/Skeleton";

const MdrrmoModuleDistributionChart = lazy(() =>
  import("./components/MdrrmoCharts").then((module) => ({
    default: module.MdrrmoModuleDistributionChart,
  }))
);
const MdrrmoEnrollmentTrendChart = lazy(() =>
  import("./components/MdrrmoCharts").then((module) => ({
    default: module.MdrrmoEnrollmentTrendChart,
  }))
);

export default function Overview() {
  useDocumentTitle("MDRRMO Overview | Admin Console");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: session } = authClient.useSession();
  const userRole = session?.user?.role;
  const isStandardMdrrmo = userRole === "mdrrmo_admin";

  const {
    data: metricsData,
    isLoading: metricsLoading,
    isError: metricsError,
    error,
  } = useQuery({
    queryKey: ["mdrrmoMetrics"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/mdrrmo/metrics");
      return res.data.data;
    },
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: modules = [], isLoading: isLoadingModules } = useQuery({
    queryKey: ["adminModules", "overview"],
    queryFn: async () => {
      const res = await apiClient.get("admin/modules?limit=1000");
      const data = res.data.data || [];
      return data.map((mod) => ({
        id: mod.mod_id,
        title: mod.modname,
        category: mod.modcat,
        status: mod.status,
        step_count: parseInt(mod.step_count, 10) || 0,
        description: mod.description || "",
        level: mod.level || "Level 1",
        duration: mod.duration || "Varies",
        image_url: mod.image_url || null,
      }));
    },
    refetchInterval: 60000,
    retry: 1,
  });

  if (metricsError) {
    return (
      <div className="p-4 sm:p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 space-y-2">
        <p className="font-bold text-sm sm:text-base">Error loading overview data.</p>
        <p className="text-xs bg-red-100 p-2 sm:p-3 rounded-xl font-mono break-words">
          {error?.response?.data?.message ||
            error?.message ||
            "Unknown Connection Failure"}
        </p>
        <p className="text-xs sm:text-sm text-red-500">
          Please inspect your Node.js backend terminal for details.
        </p>
      </div>
    );
  }

  const m = metricsData || {};

  const handleExportReport = () => {
    if (metricsLoading || isLoadingModules) {
      toast.error("Please wait while report data finishes loading.");
      return;
    }

    const reportDate = new Date().toISOString().split("T")[0];
    const generatedTimestamp = new Date().toLocaleString();

    // Section 1: Executive KPI Summary
    const kpiHeaders = ["KPI Metric", "Value", "Description"];
    const kpiRows = [
      ["Registered Responders", m.registered_responders ?? 0, "Total resident learner accounts registered in the system"],
      ["Active Modules", m.active_modules ?? 0, "Currently published and accessible training curriculum"],
      ["Total Enrollments", m.total_enrollments ?? 0, "Total module participation and attempts recorded"],
      ["Certificates Issued", m.certificates_issued ?? 0, "Active certificates of competency earned by residents"],
      ["Pending Approvals", m.pending_reviews ?? 0, "Curriculum modules awaiting administrative review"],
    ];

    // Section 2: Curriculum & Training Modules Inventory
    const moduleHeaders = [
      "Module ID",
      "Module Title",
      "Category",
      "Status",
      "Steps Inside",
      "Difficulty Level",
      "Duration",
    ];
    const moduleRows = (modules || []).map((mod) => [
      mod.id || "",
      `"${(mod.title || "").replace(/"/g, '""')}"`,
      `"${(mod.category || "Uncategorized").replace(/"/g, '""')}"`,
      `"${(mod.status || "draft").replace(/"/g, '""')}"`,
      mod.step_count ?? 0,
      `"${(mod.level || "Level 1").replace(/"/g, '""')}"`,
      `"${(mod.duration || "Varies").replace(/"/g, '""')}"`,
    ]);

    const csvLines = [
      `"MUNICIPAL DISASTER RISK REDUCTION AND MANAGEMENT OFFICE (MDRRMO)"`,
      `"EXECUTIVE TRAINING & DISASTER PREPAREDNESS SUMMARY REPORT"`,
      `"Generated At:","${generatedTimestamp}"`,
      "",
      `"--- SECTION 1: KEY PERFORMANCE INDICATORS ---"`,
      kpiHeaders.join(","),
      ...kpiRows.map((r) =>
        r
          .map((c) =>
            typeof c === "string" && !c.startsWith('"')
              ? `"${c.replace(/"/g, '""')}"`
              : c,
          )
          .join(","),
      ),
      "",
      `"--- SECTION 2: CURRICULUM & TRAINING MODULES INVENTORY ---"`,
      moduleHeaders.join(","),
      ...moduleRows.map((r) => r.join(",")),
    ];

    const csvContent = csvLines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `MDRRMO_Training_Summary_Report_${reportDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    toast.success("MDRRMO Training Summary Report exported successfully!");
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150 pb-8 sm:pb-12 max-w-full">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)]">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight leading-snug break-words">
            Municipal Disaster Risk Reduction and Management Office
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-medium mt-1">
            Staff & Responder Training Hub
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportReport}
            disabled={metricsLoading || isLoadingModules}
            className="flex-1 sm:flex-initial h-10 px-3.5 sm:px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold tracking-wide uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all whitespace-nowrap shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <HugeiconsIcon
              icon={Download02Icon}
              className="w-4 h-4 text-red-600 shrink-0"
            />
            <span>Export Report</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial h-10 px-3.5 sm:px-4 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-bold tracking-wide uppercase rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm whitespace-nowrap cursor-pointer"
          >
            <span>+ Broadcast Advisory</span>
          </button>

          {/* Rendered strictly for standard MDRRMO Admin */}
          {isStandardMdrrmo && (
            <Link
              to="/admin/mdrrmo/modules"
              className="w-full sm:w-auto h-10 px-3.5 sm:px-4 bg-gray-900 dark:bg-slate-800 text-white text-xs font-bold tracking-wide uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-slate-700 active:scale-[0.98] transition-all shadow-sm whitespace-nowrap"
            >
              <span>+ Create Module</span>
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Row (Fluid 5-card layout) */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
          <StatCard
            icon={FolderAddIcon}
            label="Total Active Modules"
            value={m.active_modules}
            sub="Currently published"
            color="red"
            loading={metricsLoading}
            onClick={() => {
              setStatusFilter(
                statusFilter === "published" ? null : "published",
              );
              setSelectedCategory(null);
            }}
            isActive={statusFilter === "published"}
          />
          <StatCard
            icon={Task01Icon}
            label="Pending Reviews"
            value={m.pending_reviews}
            sub="Modules awaiting approval"
            color="amber"
            loading={metricsLoading}
            onClick={() => {
              setStatusFilter(
                statusFilter === "pending_review" ? null : "pending_review",
              );
              setSelectedCategory(null);
            }}
            isActive={statusFilter === "pending_review"}
          />
          <StatCard
            icon={UserGroupIcon}
            label="Registered Responders"
            value={m.registered_responders}
            sub="Total resident accounts"
            color="blue"
            loading={metricsLoading}
            href="/admin/mdrrmo/users"
          />
          <StatCard
            icon={Certificate01Icon}
            label="Certificates Issued"
            value={m.certificates_issued}
            sub="Total verified certificates"
            color="green"
            loading={metricsLoading}
            href="/admin/mdrrmo/sector-overview"
          />
          <StatCard
            icon={BookOpen01Icon}
            label="Total Enrollments"
            value={m.total_enrollments}
            sub="Across all modules"
            color="purple"
            loading={metricsLoading}
          />
        </div>
      </div>

      {/* Row 2: Operational & Curriculum Triad */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        <div className="w-full">
          <MdrrmoRecentActivity />
        </div>
        <div className="w-full">
          <Suspense
            fallback={
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] flex flex-col justify-between h-[360px] items-center justify-center">
                <SkeletonChart type="donut" height={200} />
              </div>
            }
          >
            <MdrrmoModuleDistributionChart
              selectedCategory={selectedCategory}
              onCategoryClick={(cat) => {
                setSelectedCategory(cat);
                setStatusFilter(null);
              }}
            />
          </Suspense>
        </div>
        <div className="w-full md:col-span-2 lg:col-span-1">
          <MdrrmoQuickActions
            pendingReviewsCount={m.pending_reviews}
          />
        </div>
      </div>

      {/* Row 3: Management Catalog & Activity Analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        <div className="w-full min-w-0 overflow-hidden">
          <Suspense
            fallback={
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] flex flex-col justify-between h-[340px] items-center justify-center">
                <SkeletonChart type="area" height={220} />
              </div>
            }
          >
            <MdrrmoEnrollmentTrendChart />
          </Suspense>
        </div>
        <div className="w-full min-w-0 overflow-hidden">
          <ActiveModulesTable
            modules={modules}
            isLoading={isLoadingModules}
            selectedCategory={selectedCategory}
            statusFilter={statusFilter}
          />
        </div>
      </div>

      {/* Upgraded Modal with MDRRMO Jurisdictional Scope */}
      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUserRole="mdrrmo_admin"
      />
    </div>
  );
}
