import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  UserGroupIcon, 
  Certificate01Icon, 
  Activity01Icon, 
  Notification01Icon, 
  Alert01Icon, 
  UserAdd01Icon, 
  Search01Icon, 
  ArrowRight01Icon, 
  ArrowLeft01Icon,
  Shield01Icon, 
  RefreshIcon, 
  Note01Icon, 
  Download01Icon, 
  Download02Icon,
  Folder01Icon,
  QrCodeIcon,
  Award01Icon,
  Message01Icon
} from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import StatCard from "../../system/overview/components/StatCard";
import WorkspaceOverviewSkeleton from "./WorkspaceOverviewSkeleton";
import ResidentInspectorPanel from "../../shared/ResidentInspectorPanel";
import AnnouncementModal from "./announcementModal";
import CertificateVerificationModal from "../../../../components/ui/certificates/CertificateVerificationModal";
import apiClient from "../../../../lib/apiClient";

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
  const navigate = useNavigate();
  const [selectedResident, setSelectedResident] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [modulePage, setModulePage] = useState(1);
  const moduleLimit = 5;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
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
  
  // Defined here to prevent ReferenceError
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
      
      {/* Header Row (Matching MDRRMO Header Card Design) */}
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={UserGroupIcon}
          label="Total Residents"
          value={totalResidents}
          sub="All registered locals"
          trendText="Jurisdiction"
          color="blue"
          loading={isLoading || isFetching}
        />
        <StatCard
          icon={Certificate01Icon}
          label="Certified Safe"
          value={certifiedCount}
          sub="Passed DRRM training"
          trendText="Safe Certified"
          color="green"
          loading={isLoading || isFetching}
        />
        <StatCard
          icon={Activity01Icon}
          label="Active Learners"
          value={activeLearners}
          sub="Recent module activity"
          trendText="Active 30d"
          color="amber"
          loading={isLoading || isFetching}
        />
        <StatCard
          icon={UserAdd01Icon}
          label="Pending Status"
          value={pendingCount}
          sub="In training / uncertified"
          trendText="Incomplete"
          color="gray"
          loading={isLoading || isFetching}
        />
        <StatCard
          icon={Notification01Icon}
          label="Local Advisories"
          value={localAlertsCount}
          sub="Sector announcements"
          trendText="Advisories"
          color="red"
          loading={isLoading || isFetching}
        />
      </div>

      {/* Row 2: Analytics Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Compliance Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-4 flex flex-col justify-between">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900">Community Safety Compliance</h3>
            <p className="text-xs text-gray-400 mt-0.5">Ratio of certified vs uncertified citizens</p>
          </div>

          <div className="my-auto py-4 flex flex-col items-center justify-center relative">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-100"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500"
                  strokeDasharray={`${preparednessRate}, 100`}
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black font-mono text-gray-900">{preparednessRate}%</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Certified</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-gray-600 font-medium">{certifiedCount} Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              <span className="text-gray-600 font-medium">{pendingCount} Pending</span>
            </div>
          </div>
        </div>

        {/* Curriculum Training Completion Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Curriculum Readiness</h3>
              <p className="text-xs text-gray-400 mt-0.5">Disaster module completions</p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
              MDRRMO Scoped
            </span>
          </div>

          <div className="space-y-4 my-auto py-3">
            {modulePerformance.length === 0 ? (
              <div className="text-center py-8">
                <HugeiconsIcon icon={Folder01Icon} className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400 italic">No syllabus engagement recorded yet for this barangay.</p>
              </div>
            ) : (
              paginatedModules.map((mod) => {
                const enrolled = parseInt(mod.total_enrolled, 10) || 0;
                const completed = parseInt(mod.completed_count, 10) || 0;
                const rate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;

                return (
                  <div key={mod.module_id} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-gray-800">{mod.module_title}</span>
                      <span className="font-mono text-gray-500">{completed}/{enrolled} ({rate}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-red-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Table / List Pagination Footer */}
          <div className="pt-3 border-t border-gray-100 space-y-2.5">
            {totalModules > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                  Showing <span className="font-medium text-gray-900">{(modulePage - 1) * moduleLimit + 1}</span> to{" "}
                  <span className="font-medium text-gray-900">
                    {Math.min(modulePage * moduleLimit, totalModules)}
                  </span>{" "}
                  of <span className="font-medium text-gray-900">{totalModules}</span> modules
                </p>
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setModulePage((p) => Math.max(p - 1, 1))}
                    disabled={modulePage <= 1}
                    className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3 h-3" />
                    Previous
                  </button>
                  <span className="text-xs font-medium text-gray-600 px-1">
                    Page {modulePage} of {totalModulePages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModulePage((p) => Math.min(p + 1, totalModulePages))}
                    disabled={modulePage >= totalModulePages}
                    className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    Next
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
            <div className="text-[11px] text-gray-400 flex justify-between">
              <span>Minimum Passing: 80%</span>
              <span>Accredited DRRM Standard</span>
            </div>
          </div>
        </div>

        {/* Quick Admin Actions */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-3 flex flex-col justify-between">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
            <p className="text-xs text-gray-400 mt-0.5">Barangay administrative tools</p>
          </div>

          <div className="flex-1 flex flex-col justify-between gap-2.5 pt-3">
            {/* Verify Certificate */}
            <button
              type="button"
              onClick={() => setIsVerifyModalOpen(true)}
              className="group w-full flex items-center justify-between p-2.5 bg-red-50/60 hover:bg-red-50 rounded-xl text-xs transition-all border border-red-100/80 hover:border-red-200 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 rounded-lg bg-red-100/80 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <HugeiconsIcon icon={QrCodeIcon} className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-red-900">Verify Certificate</div>
                  <div className="text-[10px] text-red-700/70 font-medium">Scan or validate QR code</div>
                </div>
              </div>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 text-red-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
            </button>

            {/* Manage Residents */}
            <button
              type="button"
              onClick={() => navigate("/admin/barangay/residents")}
              className="group w-full flex items-center justify-between p-2.5 bg-gray-50/70 hover:bg-blue-50/40 rounded-xl text-xs transition-all border border-gray-100 hover:border-blue-100 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800 group-hover:text-blue-900">Manage Residents</div>
                  <div className="text-[10px] text-gray-400 font-medium">Jurisdiction roster & records</div>
                </div>
              </div>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
            </button>

            {/* Certification Roster */}
            <button
              type="button"
              onClick={() => navigate("/admin/barangay/certifications")}
              className="group w-full flex items-center justify-between p-2.5 bg-gray-50/70 hover:bg-amber-50/40 rounded-xl text-xs transition-all border border-gray-100 hover:border-amber-100 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <HugeiconsIcon icon={Award01Icon} className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800 group-hover:text-amber-900">Certification Roster</div>
                  <div className="text-[10px] text-gray-400 font-medium">Review certified locals</div>
                </div>
              </div>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 text-gray-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
            </button>

            {/* Resident Feedback */}
            <button
              type="button"
              onClick={() => navigate("/admin/barangay/feedback")}
              className="group w-full flex items-center justify-between p-2.5 bg-gray-50/70 hover:bg-emerald-50/40 rounded-xl text-xs transition-all border border-gray-100 hover:border-emerald-100 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <HugeiconsIcon icon={Message01Icon} className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800 group-hover:text-emerald-900">Resident Feedback</div>
                  <div className="text-[10px] text-gray-400 font-medium">Inquiries & community reports</div>
                </div>
              </div>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
            </button>
          </div>
        </div>

      </div>

      {/* Row 3: High Density Resident Table & Live Selection Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Monitored Citizen Records</h3>
              <p className="text-xs text-gray-400">Residents belonging to your jurisdiction</p>
            </div>
            <div className="relative">
              <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search citizen..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-56"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 bg-gray-50/50">
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Citizen Identity</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-center">Score</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-center">Status</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-400 italic">
                      No citizen profiles found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredResidents.slice(0, 7).map((r) => (
                    <tr
                      key={r.id || r._id}
                      onClick={() => setSelectedResident(r)}
                      className={`cursor-pointer transition-colors ${
                        selectedResident?.id === r.id ? "bg-red-50/60 font-medium" : "hover:bg-gray-50/50"
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900">{r.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{r.email}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-gray-600">
                        {r.quizScore || 0}%
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            r.status === "Ready"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-amber-50 text-amber-600 border border-amber-200"
                          }`}
                        >
                          {r.status || "Pending"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResident(r);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

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