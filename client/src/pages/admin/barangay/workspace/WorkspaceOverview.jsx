import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, Download02Icon } from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";

import WorkspaceOverviewSkeleton from "./WorkspaceOverviewSkeleton";
import ResidentInspectorPanel from "../../shared/ResidentInspectorPanel";
import AnnouncementModal from "./announcementModal";
import CertificateVerificationModal from "../../../../components/ui/certificates/CertificateVerificationModal";
import apiClient from "../../../../lib/apiClient";

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

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["barangayWorkspaceOverview"],
    queryFn: fetchOverviewData,
    retry: 1,
  });

  if (isLoading) return <WorkspaceOverviewSkeleton />;

  if (isError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3">
        <HugeiconsIcon icon={Alert01Icon} className="w-5 h-5 shrink-0 text-red-600" />
        <div>
          <p className="font-bold text-sm">Failed to load barangay workspace</p>
          <p className="text-xs text-red-500">Ensure your administrative account is assigned to an active sector jurisdiction.</p>
        </div>
      </div>
    );
  }

  const residents = Array.isArray(data?.residents) ? data.residents : [];
  const kpis = data?.analytics?.kpis || {};
  const modulePerformance = data?.analytics?.modulePerformance || [];
  const totalModules = modulePerformance.length;
  const totalModulePages = Math.max(1, Math.ceil(totalModules / moduleLimit));
  const paginatedModules = modulePerformance.slice((modulePage - 1) * moduleLimit, modulePage * moduleLimit);
  
  const barangay = data?.analytics?.barangay || { id: null, name: "Local Jurisdiction" };
  const formattedBarangayName = barangay.name?.toLowerCase().startsWith("barangay")
    ? barangay.name
    : `Barangay ${barangay.name || "Local"}`;

  const totalResidents = parseInt(kpis.total_residents, 10) || residents.length;
  const certifiedCount = parseInt(kpis.certified_residents, 10) || 0;
  const activeLearners = parseInt(kpis.active_learners, 10) || 0;
  const localAlertsCount = parseInt(kpis.local_alerts, 10) || 0;

  const preparednessRate = totalResidents > 0 ? Math.round((certifiedCount / totalResidents) * 100) : 0;
  const pendingCount = Math.max(0, totalResidents - certifiedCount);

  const filteredResidents = residents.filter(r => 
    r.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleVerifyCertificate = () => {
    setIsVerifyModalOpen(true);
  };

  const handleExportReport = () => {
    if (!residents.length) {
      toast.error("No resident records available to export.");
      return;
    }
    const headers = ["ID", "Name", "Email", "Jurisdiction", "Quiz Score", "Status"];
    const rows = residents.map((r) => [
      r.id || "",
      `"${(r.name || "").replace(/"/g, '""')}"`,
      `"${(r.email || "").replace(/"/g, '""')}"`,
      `"${formattedBarangayName}"`,
      `${r.quizScore || 0}%`,
      `"${r.status || "Pending"}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${formattedBarangayName.replace(/\s+/g, "_")}_DRRM_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported report for ${formattedBarangayName}!`);
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-150 pb-10">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)]">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            {formattedBarangayName} Community Portal
          </h1>
          <p className="text-[14px] text-gray-500 font-medium mt-1">
            Disaster Preparedness & Local Oversight Hub
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={handleExportReport}
            className="h-10 px-4 bg-white border border-gray-200 text-gray-700 text-[12px] font-bold tracking-wide uppercase rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-colors whitespace-nowrap shadow-sm cursor-pointer"
          >
            <HugeiconsIcon
              icon={Download02Icon}
              className="w-4 h-4 text-red-600 shrink-0"
            />
            Export Report
          </button>
          <button
            type="button"
            onClick={() => setIsAnnouncementModalOpen(true)}
            className="h-10 px-4 bg-red-600 text-white text-[12px] font-bold tracking-wide uppercase rounded-xl flex items-center gap-2 hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap cursor-pointer"
          >
            + Post Announcement
          </button>
        </div>
      </div>

      {/* Row 1: 5 Metric Cards */}
      <WorkspaceKpiGrid
        totalResidents={totalResidents}
        certifiedCount={certifiedCount}
        activeLearners={activeLearners}
        pendingCount={pendingCount}
        localAlertsCount={localAlertsCount}
        loading={isLoading || isFetching}
      />

      {/* Row 2: Analytics Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <CommunityComplianceCard
          preparednessRate={preparednessRate}
          certifiedCount={certifiedCount}
          pendingCount={pendingCount}
        />

        <CurriculumReadinessCard
          modulePerformance={modulePerformance}
          paginatedModules={paginatedModules}
          modulePage={modulePage}
          setModulePage={setModulePage}
          totalModules={totalModules}
          totalModulePages={totalModulePages}
          moduleLimit={moduleLimit}
        />

        <WorkspaceQuickActions
          onOpenVerifyModal={handleVerifyCertificate}
          onOpenAnnouncementModal={() => setIsAnnouncementModalOpen(true)}
        />
      </div>

      {/* Row 3: High Density Resident Table & Live Selection Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <MonitoredCitizenTable
          filteredResidents={filteredResidents}
          selectedResident={selectedResident}
          setSelectedResident={setSelectedResident}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
        />

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-4 min-h-[350px]">
          <div className="border-b border-gray-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-gray-900">Active Profile Inspector</h3>
            <p className="text-xs text-gray-400">Citizen compliance audit details</p>
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