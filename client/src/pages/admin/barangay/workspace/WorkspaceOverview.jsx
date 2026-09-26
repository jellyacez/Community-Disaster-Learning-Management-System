import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, Download02Icon } from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";

import WorkspaceOverviewSkeleton from "./WorkspaceOverviewSkeleton";
import ResidentInspectorPanel from "../../shared/ResidentInspectorPanel";
import AnnouncementModal from "./announcementModal";
import CertificateVerificationModal from "../../../../components/ui/certificates/CertificateVerificationModal";
import apiClient from "../../../../lib/apiClient";
import useDebounce from "../../../../hooks/useDebounce";

// Modular sub-components
import WorkspaceKpiGrid from "./components/WorkspaceKpiGrid";
import CommunityComplianceCard from "./components/CommunityComplianceCard";
import CurriculumReadinessCard from "./components/CurriculumReadinessCard";
import WorkspaceQuickActions from "./components/WorkspaceQuickActions";
import MonitoredCitizenTable from "./components/MonitoredCitizenTable";

const fetchOverviewData = async () => {
  const [residentsRes, analyticsRes] = await Promise.all([
    apiClient.get("/admin/residents"),
    apiClient.get("/admin/barangay/analytics"),
  ]);

  return {
    residents: residentsRes.data?.data || residentsRes.data || [],
    analytics: analyticsRes.data?.data || {},
  };
};

export default function WorkspaceOverview() {
  const [selectedResident, setSelectedResident] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [modulePage, setModulePage] = useState(1);
  const moduleLimit = 5;

  const debouncedSearch = useDebounce(searchFilter, 350);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["barangayWorkspaceOverview"],
    queryFn: fetchOverviewData,
    retry: 1,
  });

  if (isLoading) return <WorkspaceOverviewSkeleton />;

  if (isError) {
    return (
      <div className="p-4 sm:p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-2xl flex items-start sm:items-center gap-3">
        <HugeiconsIcon
          icon={Alert01Icon}
          className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5 sm:mt-0"
        />
        <div className="min-w-0">
          <p className="font-bold text-xs sm:text-sm">Failed to load barangay workspace</p>
          <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
            Ensure your administrative account is assigned to an active sector
            jurisdiction.
          </p>
        </div>
      </div>
    );
  }

  const residents = Array.isArray(data?.residents) ? data.residents : [];
  const kpis = data?.analytics?.kpis || {};
  const modulePerformance = data?.analytics?.modulePerformance || [];
  const totalModules = modulePerformance.length;
  const totalModulePages = Math.max(1, Math.ceil(totalModules / moduleLimit));
  const paginatedModules = modulePerformance.slice(
    (modulePage - 1) * moduleLimit,
    modulePage * moduleLimit,
  );

  const barangay = data?.analytics?.barangay || {
    id: null,
    name: "Local Jurisdiction",
  };
  const formattedBarangayName = barangay.name
    ?.toLowerCase()
    .startsWith("barangay")
    ? barangay.name
    : `Barangay ${barangay.name || "Local"}`;

  const totalResidents = parseInt(kpis.total_residents, 10) || residents.length;
  const certifiedCount = parseInt(kpis.certified_residents, 10) || 0;
  const activeLearners = parseInt(kpis.active_learners, 10) || 0;
  const localAlertsCount = parseInt(kpis.local_alerts, 10) || 0;

  const preparednessRate =
    totalResidents > 0
      ? Math.round((certifiedCount / totalResidents) * 100)
      : 0;
  const pendingCount = Math.max(0, totalResidents - certifiedCount);

  const filteredResidents = residents.filter(
    (r) =>
      r.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      r.email?.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  const handleVerifyCertificate = () => {
    setIsVerifyModalOpen(true);
  };

  const handleExportReport = () => {
    if (!residents.length) {
      toast.error("No resident records available to export.");
      return;
    }
    const headers = [
      "ID",
      "Name",
      "Email",
      "Jurisdiction",
      "Modules Completed",
      "Compliance Status",
    ];
    const rows = residents.map((r) => [
      r.id || "",
      `"${(r.name || "").replace(/"/g, '""')}"`,
      `"${(r.email || "").replace(/"/g, '""')}"`,
      `"${formattedBarangayName}"`,
      r.modulesCompleted ?? 0,
      `"${(r.modulesCompleted || 0) > 0 ? "Certified" : "Pending"}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${formattedBarangayName.replace(/\s+/g, "_")}_DRRM_Report_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported report for ${formattedBarangayName}!`);
  };

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 font-sans animate-in fade-in duration-150 pb-8 sm:pb-12">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)]">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight leading-snug break-words">
            {formattedBarangayName} Community Portal
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-medium mt-1">
            Disaster Preparedness &amp; Local Oversight Hub
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 shrink-0 w-full lg:w-auto">
          <button
            type="button"
            onClick={handleExportReport}
            className="flex-1 sm:flex-initial h-10 px-3.5 sm:px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold tracking-wide uppercase rounded-xl inline-flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-750 active:scale-[0.98] transition-all whitespace-nowrap shadow-xs cursor-pointer"
          >
            <HugeiconsIcon
              icon={Download02Icon}
              className="w-4 h-4 text-red-600 shrink-0"
            />
            <span>Export Report</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAnnouncementModalOpen(true)}
            className="flex-1 sm:flex-initial h-10 px-3.5 sm:px-4 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-bold tracking-wide uppercase rounded-xl inline-flex items-center justify-center gap-2 transition-all shadow-xs whitespace-nowrap cursor-pointer"
          >
            <span>+ Broadcast Advisory</span>
          </button>
        </div>
      </div>

      {/* Row 1: KPI Metrics Grid */}
      <div className="w-full min-w-0">
        <WorkspaceKpiGrid
          totalResidents={totalResidents}
          certifiedCount={certifiedCount}
          activeLearners={activeLearners}
          pendingCount={pendingCount}
          localAlertsCount={localAlertsCount}
          loading={isLoading || isFetching}
        />
      </div>

      {/* Row 2: Analytics Visualizers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch w-full min-w-0">
        <div className="lg:col-span-4 min-w-0">
          <CommunityComplianceCard
            preparednessRate={preparednessRate}
            certifiedCount={certifiedCount}
            pendingCount={pendingCount}
          />
        </div>

        <div className="lg:col-span-5 min-w-0">
          <CurriculumReadinessCard
            modulePerformance={modulePerformance}
            paginatedModules={paginatedModules}
            modulePage={modulePage}
            setModulePage={setModulePage}
            totalModules={totalModules}
            totalModulePages={totalModulePages}
            moduleLimit={moduleLimit}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3 min-w-0">
          <WorkspaceQuickActions
            onOpenVerifyModal={handleVerifyCertificate}
            onOpenAnnouncementModal={() => setIsAnnouncementModalOpen(true)}
          />
        </div>
      </div>

      {/* Row 3: High Density Resident Table & Live Selection Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start w-full min-w-0">
        <div className="lg:col-span-8 min-w-0 overflow-x-auto">
          <MonitoredCitizenTable
            filteredResidents={filteredResidents}
            selectedResident={selectedResident}
            setSelectedResident={setSelectedResident}
            searchFilter={searchFilter}
            setSearchFilter={setSearchFilter}
          />
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs lg:col-span-4 min-h-[350px] w-full min-w-0">
          <div className="border-b border-gray-100 dark:border-slate-800 pb-3 mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100">
              Active Profile Inspector
            </h3>
            <p className="text-[11px] sm:text-xs text-gray-400 dark:text-slate-500">
              Citizen compliance audit details
            </p>
          </div>
          <ResidentInspectorPanel
            selectedResident={selectedResident}
            onVerifyCertificate={handleVerifyCertificate}
          />
        </div>
      </div>

      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        barangayName={barangay.name}
      />

      <CertificateVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
      />
    </div>
  );
}
