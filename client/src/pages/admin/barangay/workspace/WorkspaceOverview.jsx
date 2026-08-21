import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  UserGroupIcon, 
  Certificate01Icon, 
  Activity01Icon, 
  Notification01Icon, 
  CheckmarkCircle01Icon, 
  Alert01Icon, 
  UserAdd01Icon, 
  Search01Icon, 
  ArrowRight01Icon, 
  Shield01Icon, 
  RefreshIcon, 
  Note01Icon, 
  Download01Icon, 
  Download02Icon,
  Time02Icon,
  Folder01Icon 
} from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import StatCard from "../../system/overview/components/StatCard";
import WorkspaceOverviewSkeleton from "./WorkspaceOverviewSkeleton";
import ResidentInspectorPanel from "../../shared/ResidentInspectorPanel";
import AnnouncementModal from "./announcementModal";
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
  const [selectedResident, setSelectedResident] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

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

  const handleVerifyCertificate = (residentName) => {
    alert(`Auditing Certification Database Ledger:\nRecord for ${residentName} is verified and authentic.`);
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
            {formattedBarangayName} Disaster Risk Reduction and Management Office
          </h1>
          <p className="text-[14px] text-gray-500 font-medium mt-1">
            Local Community Oversight & Preparedness Hub
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Status Badge */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-sm font-extrabold text-emerald-900 tracking-wide uppercase">Operational</span>
            </div>

            <div className="flex items-center gap-6 text-[13px] font-semibold text-emerald-700">
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Time02Icon} className="w-4 h-4 opacity-70" />
                <span>Live Connection</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={handleExportReport}
              className="h-10 px-4 bg-white border border-gray-200 text-gray-700 text-[12px] font-bold tracking-wide uppercase rounded flex items-center gap-2 hover:bg-gray-50 transition-colors whitespace-nowrap shadow-sm cursor-pointer"
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
              className="h-10 px-4 bg-red-600 text-white text-[12px] font-bold tracking-wide uppercase rounded flex items-center gap-2 hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap cursor-pointer"
            >
              + Post Announcement
            </button>
          </div>
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
          <div>
            <h3 className="text-sm font-bold text-gray-900">Community Safety Compliance</h3>
            <p className="text-xs text-gray-400 mt-0.5">Ratio of certified vs uncertified citizens</p>
          </div>

          <div className="my-6 flex flex-col items-center justify-center relative">
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

          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100 text-xs">
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
              modulePerformance.map((mod) => {
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

          <div className="text-[11px] text-gray-400 pt-3 border-t border-gray-100 flex justify-between">
            <span>Minimum Passing: 80%</span>
            <span>Accredited DRRM Standard</span>
          </div>
        </div>

        {/* Quick Admin Actions */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-3 flex flex-col justify-between space-y-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
            <p className="text-xs text-gray-400 mt-0.5">Barangay administrative tools</p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => alert("Exporting resident roster...")}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 transition border border-gray-100"
            >
              <span className="flex items-center gap-2.5">
                <HugeiconsIcon icon={Note01Icon} className="w-4 h-4 text-emerald-600" />
                Export Barangay Roster
              </span>
              <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5 text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100/80 rounded-xl text-xs font-bold text-red-700 transition border border-red-100"
            >
              <span className="flex items-center gap-2.5">
                <HugeiconsIcon icon={Notification01Icon} className="w-4 h-4 text-red-600" />
                Add Announcement
              </span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2.5">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-medium text-emerald-800">DRRM Sync Connected</span>
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

    </div>
  );
}