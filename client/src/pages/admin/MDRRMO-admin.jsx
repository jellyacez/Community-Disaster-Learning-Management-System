import React, { useState } from "react";
import { authClient } from "../../lib/auth-client"; 
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  DashboardSquare01Icon, 
  FolderAddIcon,   
  UserAddIcon,     
  Alert01Icon,
  Logout01Icon 
} from "@hugeicons/core-free-icons";

// Link to the centralized semantic administrative stylesheet
import "./admin.css";
import { initialModules, initialUsers, initialResidents } from "./mockData";
import ModuleBuilder from "./ModuleBuilder";

// Only accounts with this exact role (as reported by authClient's session)
// can see or use the Module Approval page.
const HEAD_ADMIN_ROLE = "Head Admin";

// Modules created before the approval workflow existed (or any module
// missing the field) are treated as already-approved so nothing already
// live suddenly disappears from view.
const getApprovalStatus = (mod) => mod?.approvalStatus ?? "Approved";

export default function Dashboard() {
  const { data: session } = authClient.useSession();
  const isHeadAdmin = session?.user?.role === HEAD_ADMIN_ROLE;

  const [activeTab, setActiveTab] = useState("overview");

  // Core filter parameters mapped out at the top of the component scope
  const [selectedBarangay, setSelectedBarangay] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResident, setSelectedResident] = useState(null);

  const [modules, setModules] = useState(initialModules);
  const [users, setUsers] = useState(initialUsers);
  const [residents, setResidents] = useState(initialResidents);

  const [editingModuleId, setEditingModuleId] = useState(null);
  // "author" = the normal create/edit flow any MDRRMO admin uses.
  // "review" = head-admin reviewing a submission from the Approvals page;
  // ModuleBuilder swaps its footer to Approve/Reject in this mode.
  const [moduleBuilderMode, setModuleBuilderMode] = useState("author");

  const pendingModules = modules.filter((m) => getApprovalStatus(m) === "Pending");

  const [userForm, setUserForm] = useState({ name: "", email: "", role: "MDRRMO Officer" });

  // Core audit trail log ledger as mapped out in Capstone DFD Level-1
  const [systemLogs, setSystemLogs] = useState([
    { id: 1, timestamp: "2026-06-30 04:12", source: "MDRRMO Core", log: "Token-based user authorization encryption protocols validated." },
    { id: 2, timestamp: "2026-06-30 02:45", source: "BDRRMC Node", log: "Verifiable digital certificate issued successfully via automated post-assessment query." },
    { id: 3, timestamp: "2026-06-29 19:10", source: "AWS RDS Security", log: "Asynchronous data sync pipeline completed across all participating sectors." }
  ]);

  const handleEditModuleLoad = (mod) => {
    setEditingModuleId(mod.id);
    setModuleBuilderMode("author");
    setActiveTab("modules");
  };

  // Head-admin only: open a pending submission in ModuleBuilder's review
  // mode, where edits are allowed before an Approve/Reject decision.
  const handleReviewModule = (mod) => {
    setEditingModuleId(mod.id);
    setModuleBuilderMode("review");
    setActiveTab("modules");
  };

  // Head-admin only: decide on a submission without opening the editor.
  const handleQuickApprove = (mod) => {
    setModules(modules.map((m) => (m.id === mod.id ? { ...m, approvalStatus: "Approved" } : m)));
  };

  const handleQuickReject = (mod) => {
    if (!window.confirm(`Reject "${mod.title}"? The author will need to revise and resubmit.`)) return;
    setModules(modules.map((m) => (m.id === mod.id ? { ...m, approvalStatus: "Rejected" } : m)));
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) return alert("Please fill out all fields.");
    setUsers([...users, { id: Date.now(), ...userForm }]);
    setUserForm({ name: "", email: "", role: "MDRRMO Officer" });
    alert("New account parameters registered successfully.");
  };

  const handleAccountAction = (userId, action) => {
    alert(`Account ID reference node ${userId} successfully updated: ${action.toUpperCase()}`);
  };

  const handleLogout = async () => {
    sessionStorage.setItem("isLoggingOut", "true");
    await authClient.signOut();
    window.location.href = "/signin";
  };

  const filteredResidents = residents.filter(r => {
    const matchesBarangay = selectedBarangay === "All" || r.barangay === selectedBarangay;
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBarangay && matchesSearch;
  });

  const totalResidentsCount = filteredResidents.length;
  const readyCount = filteredResidents.filter(r => r.status === "Ready").length;
  const averageScore = totalResidentsCount > 0 
    ? Math.round(filteredResidents.reduce((acc, r) => acc + r.quizScore, 0) / totalResidentsCount) 
    : 0;

  return (
    <div className="admin-layout-wrapper">
      
      {/* Left Sidebar Menu */}
      <aside className="admin-sidebar">
        <div>
          <div className="sidebar-divider">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-600" />
              <h2 className="text-xl font-black font-mono tracking-wider text-gray-900">MDRRM <span className="text-red-600">HUB</span></h2>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Municipal Administration</p>
          </div>

          <nav className="space-y-1.5">
            <button 
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`admin-nav-item ${activeTab === "overview" ? "active" : ""}`}
            >
              <HugeiconsIcon icon={DashboardSquare01Icon} className="w-4 h-4" />
              Main Overview
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab("barangay")}
              className={`admin-nav-item ${activeTab === "barangay" ? "active" : ""}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              Audited Sector Data
            </button>

            <button 
              type="button"
              onClick={() => {
                setEditingModuleId(null);
                setModuleBuilderMode("author");
                setActiveTab("modules");
              }}
              className={`admin-nav-item ${activeTab === "modules" ? "active" : ""}`}
            >
              <HugeiconsIcon icon={FolderAddIcon} className="w-4 h-4" />
              Training Modules
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab("users")}
              className={`admin-nav-item ${activeTab === "users" ? "active" : ""}`}
            >
              <HugeiconsIcon icon={UserAddIcon} className="w-4 h-4" />
              Personnel Directory
            </button>

            {isHeadAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab("approvals")}
                className={`admin-nav-item ${activeTab === "approvals" ? "active" : ""}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Module Approvals
                {pendingModules.length > 0 && (
                  <span
                    className="counter"
                    style={{ marginLeft: "auto", padding: "1px 6px", fontSize: "9px" }}
                  >
                    {pendingModules.length}
                  </span>
                )}
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="admin-card-panel flex items-center gap-3 bg-gray-50/50">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-bold text-white text-sm">
              {session?.user?.name?.[0] || "M"}
            </div>
            <div className="truncate text-xs">
              <p className="font-bold truncate">{session?.user?.name || "MDRRM Admin"}</p>
              <p className="text-gray-400 truncate">{session?.user?.email || "admin.bacolor@mdrrmo.gov.ph"}</p>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="admin-nav-item justify-center text-xs border border-gray-200 bg-gray-50 hover:bg-red-50 hover:text-red-600">
            <HugeiconsIcon icon={Logout01Icon} className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area Canvas */}
      <main className="admin-main-canvas">
        <header className="admin-header">
          <div>
            <h1 className="text-sm font-bold uppercase font-mono tracking-wide text-gray-900">
              Municipal Disaster Risk Reduction and Management Office
            </h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Staff & Responder Training Hub Portal</p>
          </div>
        </header>

        <div className="admin-content-padding">
          
          {/* TAB 1: MAIN OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="admin-card-panel w-full" style={{ padding: "2.5rem 1.5rem" }}>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Active Modules</p>
                  <p className="text-4xl font-black mt-1 font-mono text-gray-800">{modules.length}</p>
                </div>
                <div className="admin-card-panel w-full" style={{ padding: "2.5rem 1.5rem" }}>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Registered Responders</p>
                  <p className="text-4xl font-black mt-1 font-mono text-gray-800">{users.length}</p>
                </div>
                <div className="admin-card-panel w-full flex items-center justify-between" style={{ borderLeft: "4px solid #10b981", backgroundColor: "#f0fdf4", padding: "2.5rem 1.5rem" }}>
                  <div>
                    <p className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider">System Status</p>
                    <p className="text-xl font-black text-emerald-800 font-mono">NORMAL / READY</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <HugeiconsIcon icon={Alert01Icon} className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="admin-card-panel lg:col-span-2 w-full">
                  <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-400 border-b border-gray-100 pb-1.5 font-mono">Active Master Modules</h3>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Module Topic</th>
                        <th className="text-center">Levels / Steps</th>
                        <th className="text-center">Visibility</th>
                        <th className="text-center">Approval</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((mod) => {
                        const levelCount = mod.levels?.length || 0;
                        const stepCount = (mod.levels || []).reduce((sum, l) => sum + (l.steps?.length || 0), 0);
                        const approvalStatus = getApprovalStatus(mod);
                        return (
                          <tr key={mod.id}>
                            <td className="font-semibold max-w-[160px] truncate">{mod.title}</td>
                            <td className="text-center font-mono text-gray-500 font-bold">
                              {levelCount} Levels &middot; {stepCount} Steps
                            </td>
                            <td className="text-center">
                              <span className={mod.status === "Private" ? "badge-review" : "badge-ready"}>
                                {mod.status || "Public"}
                              </span>
                            </td>
                            <td className="text-center">
                              <span
                                className={
                                  approvalStatus === "Approved"
                                    ? "badge-ready"
                                    : approvalStatus === "Rejected"
                                    ? "counter"
                                    : "badge-review"
                                }
                              >
                                {approvalStatus}
                              </span>
                            </td>
                            <td className="text-right">
                              <button type="button" onClick={() => handleEditModuleLoad(mod)} className="px-2 py-0.5 text-[11px] border border-gray-200 bg-white hover:bg-red-50 rounded">View / Edit</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="admin-card-panel w-full space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100 pb-1.5 font-mono">Security Web Audit Logs</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {systemLogs.map((log) => (
                      <div key={log.id} className="p-2.5 bg-gray-50 border border-gray-200/80 rounded-xl text-xs flex flex-col gap-0.5">
                        <div className="flex justify-between font-mono text-[9px] text-gray-400">
                          <span className="font-bold">{log.source}</span>
                          <span>{log.timestamp}</span>
                        </div>
                        <span className="text-gray-700 font-medium leading-tight">{log.log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDITED SECTOR DATA */}
          {activeTab === "barangay" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="admin-card-panel w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <label className="font-bold text-gray-500 uppercase font-mono">Location Filter:</label>
                  <select 
                    value={selectedBarangay} 
                    onChange={(e) => setSelectedBarangay(e.target.value)}
                    className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium focus:outline-none"
                  >
                    <option value="All">All Barangays</option>
                    <option value="Balas">Barangay Balas</option>
                    <option value="San Vicente">Barangay San Vicente</option>
                    <option value="Cabalantian">Barangay Cabalantian</option>
                  </select>
                </div>
                <input 
                  type="text" 
                  placeholder="Search resident name or status..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 p-2 border border-gray-200 text-xs rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="admin-card-panel w-full"><p className="text-[10px] text-gray-400 uppercase font-bold">Monitored Residents</p><p className="text-2xl font-black mt-1 font-mono">{totalResidentsCount}</p></div>
                <div className="admin-card-panel w-full"><p className="text-[10px] text-emerald-600 uppercase font-bold">Certified Ready</p><p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{readyCount}</p></div>
                <div className="admin-card-panel w-full"><p className="text-[10px] text-amber-500 uppercase font-bold">Average Quiz Accuracy</p><p className="text-2xl font-black text-amber-500 mt-1 font-mono">{averageScore}%</p></div>
                <div className="admin-card-panel w-full">
                  <p className="text-[10px] text-blue-600 uppercase font-bold">Coverage Rate</p>
                  <p className="text-2xl font-black text-blue-600 mt-1 font-mono">
                    {totalResidentsCount > 0 ? Math.round((filteredResidents.filter(r => r.modulesCompleted > 0).length / totalResidentsCount) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="admin-card-panel lg:col-span-2 w-full">
                  <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-400 border-b border-gray-100 pb-1.5 font-mono">District Accreditation Directory</h3>
                  <div className="overflow-x-auto">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Resident Name</th>
                          <th>Barangay Sector</th>
                          <th className="text-center">Modules Finished</th>
                          <th className="text-center">Safety Rating</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResidents.map((r) => (
                          <tr key={r.id}>
                            <td className="font-semibold">{r.name}</td>
                            <td className="font-mono text-gray-400">{r.barangay}</td>
                            <td className="text-center font-bold text-amber-600">{r.modulesCompleted} Modules</td>
                            <td className="text-center">
                              <span className={r.status === "Ready" ? "badge-ready" : "badge-review"}>
                                {r.status}
                              </span>
                            </td>
                            <td className="text-right flex justify-end gap-1.5">
                              <button type="button" onClick={() => setSelectedResident(r)} className="px-2 py-0.5 text-[11px] font-medium border border-gray-200 bg-white hover:bg-gray-50 rounded">Inspect</button>
                              {r.status === "Ready" && (
                                <button type="button" onClick={() => handleAccountAction(r.id, "revoked credential tier")} className="px-2 py-1 text-[11px] font-medium border border-red-200 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded transition-colors">Revoke</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="admin-card-panel w-full">
                  <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-400 border-b border-gray-100 pb-1.5">Participant Breakdown</h3>
                  {selectedResident ? (
                    <div className="space-y-4 text-xs animate-in fade-in duration-150">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Full Name</p>
                        <p className="text-sm font-bold mt-0.5">{selectedResident.name}</p>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Barangay Location:</span>
                          <span className="font-bold text-gray-900">{selectedResident.barangay}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Quiz Accuracy:</span>
                          <span className="font-bold text-amber-600 font-mono">{selectedResident.quizScore}%</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => alert(`Direct deployment alert notice sent successfully.`)} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors">
                        Send Direct Emergency Alert Notice
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-6 italic">Select a resident profile to review local readiness details.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRAINING MODULES CONSTRUCTOR (Module > Levels > Steps) */}
          {activeTab === "modules" && (
            <ModuleBuilder
              editingModule={modules.find((m) => m.id === editingModuleId) ?? null}
              mode={isHeadAdmin && moduleBuilderMode === "review" ? "review" : "author"}
              onSave={(savedModule) => {
                // Review-mode "Save Edits" just persists content changes and
                // leaves the pending decision untouched (ModuleBuilder already
                // preserves the existing approvalStatus in that case). Normal
                // author-mode saves apply the approval policy: head-admins
                // publish immediately, everyone else goes back to Pending.
                const finalModule =
                  moduleBuilderMode === "review"
                    ? savedModule
                    : { ...savedModule, approvalStatus: isHeadAdmin ? "Approved" : "Pending" };

                if (editingModuleId) {
                  setModules(modules.map((m) => (m.id === editingModuleId ? finalModule : m)));
                  alert("Changes saved successfully.");
                } else {
                  setModules([...modules, finalModule]);
                  alert(
                    isHeadAdmin
                      ? "Module created and published successfully."
                      : "Module submitted for head-admin approval."
                  );
                }
                setEditingModuleId(null);
                setModuleBuilderMode("author");
                setActiveTab(moduleBuilderMode === "review" ? "approvals" : "overview");
              }}
              onApprove={(savedModule) => {
                setModules(modules.map((m) => (m.id === savedModule.id ? savedModule : m)));
                setEditingModuleId(null);
                setModuleBuilderMode("author");
                setActiveTab("approvals");
              }}
              onReject={(savedModule) => {
                setModules(modules.map((m) => (m.id === savedModule.id ? savedModule : m)));
                setEditingModuleId(null);
                setModuleBuilderMode("author");
                setActiveTab("approvals");
              }}
              onCancel={() => {
                const returningFromReview = moduleBuilderMode === "review";
                setEditingModuleId(null);
                setModuleBuilderMode("author");
                setActiveTab(returningFromReview ? "approvals" : "overview");
              }}
            />
          )}

          {/* TAB 5: MODULE APPROVALS (head-admin only) */}
          {activeTab === "approvals" && isHeadAdmin && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="admin-card-panel w-full">
                  <p className="text-[10px] text-amber-600 uppercase font-bold">Pending Review</p>
                  <p className="text-2xl font-black text-amber-600 mt-1 font-mono">
                    {modules.filter((m) => getApprovalStatus(m) === "Pending").length}
                  </p>
                </div>
                <div className="admin-card-panel w-full">
                  <p className="text-[10px] text-emerald-600 uppercase font-bold">Approved</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                    {modules.filter((m) => getApprovalStatus(m) === "Approved").length}
                  </p>
                </div>
                <div className="admin-card-panel w-full">
                  <p className="text-[10px] text-red-600 uppercase font-bold">Rejected</p>
                  <p className="text-2xl font-black text-red-600 mt-1 font-mono">
                    {modules.filter((m) => getApprovalStatus(m) === "Rejected").length}
                  </p>
                </div>
              </div>

              <div className="admin-card-panel w-full">
                <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-400 border-b border-gray-100 pb-1.5 font-mono">
                  Pending Submissions
                </h3>
                {modules.filter((m) => getApprovalStatus(m) === "Pending").length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 italic">
                    Nothing waiting on your review right now.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Module Topic</th>
                          <th className="text-center">Levels / Steps</th>
                          <th className="text-center">Visibility</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules
                          .filter((m) => getApprovalStatus(m) === "Pending")
                          .map((mod) => {
                            const levelCount = mod.levels?.length || 0;
                            const stepCount = (mod.levels || []).reduce((sum, l) => sum + (l.steps?.length || 0), 0);
                            return (
                              <tr key={mod.id}>
                                <td className="font-semibold max-w-[160px] truncate">{mod.title}</td>
                                <td className="text-center font-mono text-gray-500 font-bold">
                                  {levelCount} Levels &middot; {stepCount} Steps
                                </td>
                                <td className="text-center">
                                  <span className={mod.status === "Private" ? "badge-review" : "badge-ready"}>
                                    {mod.status || "Public"}
                                  </span>
                                </td>
                                <td className="text-right space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleReviewModule(mod)}
                                    className="px-2 py-0.5 text-[11px] border border-gray-200 bg-white hover:bg-gray-50 rounded"
                                  >
                                    Review &amp; Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickReject(mod)}
                                    className="px-2 py-0.5 text-[11px] border border-red-200 text-red-600 hover:bg-red-600 hover:text-white font-semibold rounded"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickApprove(mod)}
                                    className="px-2 py-0.5 text-[11px] border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white font-semibold rounded"
                                  >
                                    Approve
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="admin-card-panel w-full">
                <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-400 border-b border-gray-100 pb-1.5 font-mono">
                  Decision History
                </h3>
                {modules.filter((m) => getApprovalStatus(m) !== "Pending").length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 italic">No decisions recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Module Topic</th>
                          <th className="text-center">Decision</th>
                          <th>Reviewer Notes</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules
                          .filter((m) => getApprovalStatus(m) !== "Pending")
                          .map((mod) => (
                            <tr key={mod.id}>
                              <td className="font-semibold max-w-[160px] truncate">{mod.title}</td>
                              <td className="text-center">
                                <span className={getApprovalStatus(mod) === "Approved" ? "badge-ready" : "counter"}>
                                  {getApprovalStatus(mod)}
                                </span>
                              </td>
                              <td className="text-gray-500 max-w-[220px] truncate">{mod.reviewNote || "—"}</td>
                              <td className="text-right">
                                <button
                                  type="button"
                                  onClick={() => handleReviewModule(mod)}
                                  className="px-2 py-0.5 text-[11px] border border-gray-200 bg-white hover:bg-gray-50 rounded"
                                >
                                  Reopen
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ADD AND MANAGE PERSONNEL */}
          {activeTab === "users" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-150">
              <div className="admin-card-panel lg:col-span-2 w-full space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 border-b pb-1.5 font-mono">Governance Personnel Node Tiers</h3>
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Identity Profile</th>
                        <th>Account Tier Role</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => u.role !== "Field Responder").map((u) => (
                        <tr key={u.id}>
                          <td>
                            <p className="font-semibold">{u.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{u.email}</p>
                          </td>
                          <td><span className="counter" style={{ padding: "2px 6px", fontSize: "10px" }}>{u.role}</span></td>
                          <td className="text-right space-x-1.5">
                            <button type="button" onClick={() => handleAccountAction(u.id, "archived system account record")} className="px-2 py-0.5 text-[10px] border border-slate-200 hover:bg-slate-50 font-semibold rounded">Archive</button>
                            <button type="button" onClick={() => handleAccountAction(u.id, "banned and terminated authorization credentials")} className="px-2 py-0.5 text-[10px] border border-red-200 text-red-600 hover:bg-red-600 hover:text-white font-semibold rounded">Ban</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="admin-card-panel w-full space-y-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1.5 font-mono">Register District Personnel</h2>
                <form onSubmit={handleUserSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Personnel Full Name</label>
                    <input type="text" placeholder="e.g., Juan Dela Cruz" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Official Email Address</label>
                    <input type="email" placeholder="username@mdrrmo.gov.ph" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">System Account Role Scope</label>
                    <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full p-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs focus:outline-none">
                      <option value="MDRRMO Officer">MDRRMO Communications Officer</option>
                      <option value="System Admin">System Administrator</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm">Create Account Parameters</button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}