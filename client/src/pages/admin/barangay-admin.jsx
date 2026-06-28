import React, { useState } from "react";
import { authClient } from "../../lib/auth-client"; 
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  DashboardSquare01Icon, 
  Logout01Icon 
} from "@hugeicons/core-free-icons";

// Central administrative design system styles
import "./admin.css";
import { initialModules, initialResidents } from "./mockData";

export default function BarangayAdminDashboard() {
  const { data: session } = authClient.useSession();
  
  const [activeTab, setActiveTab] = useState("barangay"); 
  const [selectedBarangay, setSelectedBarangay] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResident, setSelectedResident] = useState(null);

  // Read-only baseline modules state reference
  const [modules] = useState(initialModules);
  const [residents] = useState(initialResidents);

  const handleLogout = async () => {
    sessionStorage.setItem("isLoggingOut", "true");
    await authClient.signOut();
    window.location.href = "/signin";
  };

  // Process and filter real-time local compliance lists
  const filteredResidents = residents.filter(r => {
    const matchesBarangay = selectedBarangay === "All" || r.barangay === selectedBarangay;
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBarangay && matchesSearch;
  });

  const totalResidentsCount = filteredResidents.length;
  const completedCount = filteredResidents.filter(r => r.status === "Ready").length;
  const inProgressCount = filteredResidents.filter(r => r.modulesCompleted > 0 && r.status !== "Ready").length;

  return (
    <div className="admin-layout-wrapper">
      
      {/* Left Sidebar Menu */}
      <aside className="admin-sidebar">
        <div>
          <div className="sidebar-divider">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-600" />
              <h2 className="text-xl font-black font-mono tracking-wider text-gray-900">
                Barangay Admin
              </h2>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Local Operations Desk</p>
          </div>

          <nav className="space-y-1.5">
            <button 
              type="button"
              onClick={() => setActiveTab("barangay")}
              className={`admin-nav-item ${activeTab === "barangay" ? "active" : ""}`}
            >
              <HugeiconsIcon icon={DashboardSquare01Icon} className="w-4 h-4" />
              Compliance Registry
            </button>
            
            <button 
              type="button"
              onClick={() => setActiveTab("modules-list")}
              className={`admin-nav-item ${activeTab === "modules-list" ? "active" : ""}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168 0.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332 0.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332 0.477-4.5 1.253" />
              </svg>
              Available Syllabus
            </button>
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="admin-card-panel flex items-center gap-3 bg-gray-50/50">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-bold text-white text-sm">
              {session?.user?.name?.[0] || "A"}
            </div>
            <div className="truncate text-xs">
              <p className="font-bold truncate">{session?.user?.name || "Barangay Admin"}</p>
              <p className="text-gray-400 truncate">{session?.user?.email || "barangay.desk@bdrrmc.gov.ph"}</p>
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
              Barangay Admin
            </h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Community Training Logs & Compliance Analytics</p>
          </div>
        </header>

        <div className="admin-content-padding">
          
          {/* TAB 1: COMPLIANCE REGISTRY TRACKING */}
          {activeTab === "barangay" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Filter Row Control block */}
              <div className="admin-card-panel flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <label className="font-bold text-gray-500 uppercase font-mono">Sector Filter:</label>
                  <select 
                    value={selectedBarangay} 
                    onChange={(e) => setSelectedBarangay(e.target.value)}
                    className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium focus:outline-none"
                  >
                    <option value="All">All Registered Sectors</option>
                    <option value="Balas">Barangay Balas</option>
                    <option value="San Vicente">Barangay San Vicente</option>
                    <option value="Cabalantian">Barangay Cabalantian</option>
                  </select>
                </div>
                <input 
                  type="text" 
                  placeholder="Filter by resident name or progress level..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 p-2 border border-gray-200 text-xs rounded-lg focus:outline-none"
                />
              </div>

              {/* Status Performance Statistics Counters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="admin-card-panel">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Total Enrolled Locals</p>
                  <p className="text-2xl font-black mt-1 font-mono">{totalResidentsCount}</p>
                </div>
                <div className="admin-card-panel">
                  <p className="text-[10px] text-emerald-600 uppercase font-bold">Completed (Fully Certified)</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{completedCount}</p>
                </div>
                <div className="admin-card-panel">
                  <p className="text-[10px] text-blue-600 uppercase font-bold">Active (In Progress)</p>
                  <p className="text-2xl font-black text-blue-600 mt-1 font-mono">{inProgressCount}</p>
                </div>
              </div>

              {/* Splitted Table Tracking Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="admin-card-panel lg:col-span-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-400 border-b border-gray-100 pb-1.5">Sector Progression Metrics</h3>
                  <div className="overflow-x-auto">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Resident Participant Name</th>
                          <th>Sector Location</th>
                          <th className="text-center">Modules Completed</th>
                          <th className="text-center">Tracking State</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResidents.map((r) => (
                          <tr key={r.id}>
                            <td className="font-semibold">{r.name}</td>
                            <td className="font-mono text-gray-400">{r.barangay}</td>
                            <td className="text-center font-bold text-gray-700">{r.modulesCompleted} Cleared</td>
                            <td className="text-center">
                              <span className={r.status === "Ready" ? "badge-ready" : "badge-review"}>
                                {r.status === "Ready" ? "Done / Certified" : "In Progress"}
                              </span>
                            </td>
                            <td className="text-right">
                              <button 
                                type="button" 
                                onClick={() => setSelectedResident(r)}
                                className="px-2 py-0.5 text-[11px] font-medium border border-gray-200 bg-white hover:bg-red-600 hover:text-white rounded transition-colors"
                              >
                                Review Metrics
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Inspect Profile Details Component Breakdown */}
                <div className="admin-card-panel">
                  <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-400 border-b border-gray-100 pb-1.5">Participant Tracker Profile</h3>
                  {selectedResident ? (
                    <div className="space-y-4 text-xs animate-in fade-in duration-150">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Full Name</p>
                        <p className="text-sm font-bold mt-0.5">{selectedResident.name}</p>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Modules Completed:</span>
                          <span className="font-bold text-gray-900 font-mono">{selectedResident.modulesCompleted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Average Quiz Accuracy:</span>
                          <span className="font-bold text-amber-600 font-mono">{selectedResident.quizScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Last System Ping:</span>
                          <span className="text-gray-600 font-mono">{selectedResident.lastActive || "Recently"}</span>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => alert(`Local sector reminder alert pinged to ${selectedResident.name}.`)}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Send Module Completion Reminder
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-6 italic">
                      Select a participant profile to review their completion state and verification metrics.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: READ-ONLY SYLLABUS LISTING */}
          {activeTab === "modules-list" && (
            <div className="admin-card-panel space-y-4 animate-in fade-in duration-150">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100 pb-1.5">Active Program Syllabus (Read-Only)</h3>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Module Topic / Protocol Title</th>
                      <th>Risk Urgency Tiers</th>
                      <th className="text-right">Total Steps Inside</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((mod) => (
                      <tr key={mod.id}>
                        <td className="font-semibold">{mod.title}</td>
                        <td>
                          <span className="counter" style={{ padding: '3px 8px', fontSize: '9px' }}>
                            {mod.riskLevel || "Standard"}
                          </span>
                        </td>
                        <td className="text-right font-mono font-bold text-gray-500">
                          {mod.flows?.length || 0} training steps
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}