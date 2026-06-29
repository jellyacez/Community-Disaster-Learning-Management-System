import React, { useState } from "react";
import { authClient } from "../../lib/auth-client"; 
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  DashboardSquare01Icon, 
  Settings01Icon,
  Note01Icon,
  Task01Icon,
  Logout01Icon 
} from "@hugeicons/core-free-icons";

// Central administrative design system stylesheet
import "./admin.css";
import { initialModules, initialResidents } from "./mockData";

export default function BarangayAdminDashboard() {
  const { data: session } = authClient.useSession();
  
  // Tab routing states mapping to side navigation selections
  const [activeTab, setActiveTab] = useState("workspace"); 
  const [selectedSector, setSelectedSector] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResident, setSelectedResident] = useState(null);

  // Core administrative state frameworks
  const [categories, setCategories] = useState([
    "Earthquake Protocols & Drills", 
    "Flash Flood Evacuation Procedures", 
    "Structural Fire Prevention & Safety"
  ]);
  const [newCategory, setNewCategory] = useState("");
  const [residents, setResidents] = useState(initialResidents);
  const [modules] = useState(initialModules);

  // Web logs trail ledger state
  const [webLogs] = useState([
    { id: 1, timestamp: "2026-06-30 08:32", activity: "Resident Carlos Pineda completed Flash Flood Module Level 1" },
    { id: 2, timestamp: "2026-06-30 09:15", activity: "Certificate QR Code generated for record #cert_98231" },
    { id: 3, timestamp: "2026-06-29 14:22", activity: "Sector filter criteria updated by Barangay Admin Desk" },
    { id: 4, timestamp: "2026-06-29 16:45", activity: "Resident Elena Santos initialized interactive earthquake simulation" }
  ]);

  const handleLogout = async () => {
    sessionStorage.setItem("isLoggingOut", "true");
    await authClient.signOut();
    window.location.href = "/signin";
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return alert("Please enter a category name.");
    setCategories([...categories, newCategory.trim()]);
    setNewCategory("");
    alert("Local category context appended successfully.");
  };

  const handleVerifyCertificate = (residentName) => {
    alert(`Auditing Certification Database Ledger:\nRecord for ${residentName} is verified, authentic, and matches server records.`);
  };

  // Data processing array filters
  const filteredResidents = residents.filter(r => {
    const matchesSector = selectedSector === "All" || r.barangay === selectedSector;
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSector && matchesSearch;
  });

  const totalResidentsCount = filteredResidents.length;
  const certifiedCount = filteredResidents.filter(r => r.status === "Ready").length;
  const inProgressCount = filteredResidents.filter(r => r.modulesCompleted > 0 && r.status !== "Ready").length;

  return (
    <div className="admin-layout-wrapper">
      
      {/* Left Sidebar Menu - Configured with clear semantic groupings */}
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
              onClick={() => setActiveTab("workspace")}
              className={`admin-nav-item ${activeTab === "workspace" ? "active" : ""}`}
            >
              <HugeiconsIcon icon={DashboardSquare01Icon} className="w-4 h-4" />
              Main Workspace
            </button>

            <div className="pt-4 pb-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider font-mono">
              Management Portals
            </div>

            <button 
              type="button" 
              onClick={() => setActiveTab("registry")}
              className={`admin-nav-item ${activeTab === "registry" ? "active" : ""}`}
            >
              <HugeiconsIcon icon={DashboardSquare01Icon} className="w-4 h-4" />
              Full Registry Log
            </button>

            <button 
              type="button" 
              onClick={() => setActiveTab("categories")}
              className={`admin-nav-item ${activeTab === "categories" ? "active" : ""}`}
            >
              <HugeiconsIcon icon={Settings01Icon} className="w-4 h-4" />
              Category Content Manager
            </button>

            <button 
              type="button" 
              onClick={() => setActiveTab("logs")}
              className={`admin-nav-item ${activeTab === "logs" ? "active" : ""}`}
            >
              <HugeiconsIcon icon={Note01Icon} className="w-4 h-4" />
              Audit Web Trail
            </button>

            <button 
              type="button" 
              onClick={() => setActiveTab("syllabus")}
              className={`admin-nav-item ${activeTab === "syllabus" ? "active" : ""}`}
            >
              <HugeiconsIcon icon={Task01Icon} className="w-4 h-4" />
              Program Syllabus
            </button>
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="admin-card-panel flex items-center gap-3 bg-gray-50/50">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-bold text-white text-sm">
              {session?.user?.name?.[0] || "B"}
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
              {activeTab === "workspace" && "Main Workspace Overview"}
              {activeTab === "registry" && "Residential Compliance Registry"}
              {activeTab === "categories" && "Localized Category Configurations"}
              {activeTab === "logs" && "System Web Logs Audit Trail"}
              {activeTab === "syllabus" && "Active Central Training Curriculum"}
            </h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Bacolor Disaster Preparedness Training Program</p>
          </div>
        </header>

        <div className="admin-content-padding space-y-6">
          
          {/* ========================================================================= */}
          {/* PAGE VIEW 1: UNIFIED ALL-IN-ONE COCKPIT MAIN WORKSPACE                    */}
          {/* ========================================================================= */}
          {activeTab === "workspace" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Global Statistical Metrics Counters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="admin-card-panel">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Total Monitored Locals</p>
                  <p className="text-2xl font-black mt-0.5 font-mono text-gray-800">{totalResidentsCount}</p>
                </div>
                <div className="admin-card-panel" style={{ borderLeft: "4px solid #10b981" }}>
                  <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wide">Certified Safe Records</p>
                  <p className="text-2xl font-black text-emerald-600 mt-0.5 font-mono">{certifiedCount}</p>
                </div>
                <div className="admin-card-panel" style={{ borderLeft: "4px solid #3b82f6" }}>
                  <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wide">Active Training Track</p>
                  <p className="text-2xl font-black text-blue-600 mt-0.5 font-mono">{inProgressCount}</p>
                </div>
              </div>

              {/* High Density Table & Inspection Grid Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="admin-card-panel lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 font-mono">Sector Progression Metrics</h3>
                    <button type="button" onClick={() => setActiveTab("registry")} className="text-[11px] font-bold text-red-600 hover:underline">
                      Open Detailed Registry Page →
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Resident Profile</th>
                          <th>Sector Location</th>
                          <th className="text-center">Syllabus Progress</th>
                          <th className="text-center">Tracking State</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResidents.slice(0, 5).map((r) => (
                          <tr key={r.id}>
                            <td className="font-semibold text-gray-800">{r.name}</td>
                            <td className="font-mono text-gray-400">{r.barangay}</td>
                            <td className="text-center font-medium text-gray-700">{r.modulesCompleted} Modules</td>
                            <td className="text-center">
                              <span className={r.status === "Ready" ? "badge-ready" : "badge-review"}>
                                {r.status === "Ready" ? "Certified" : "In Progress"}
                              </span>
                            </td>
                            <td className="text-right">
                              <button type="button" onClick={() => setSelectedResident(r)} className="px-2 py-0.5 text-[10px] font-medium border border-gray-200 bg-white hover:bg-gray-50 rounded">Inspect</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Inspect Sidebar Module Card */}
                <div className="admin-card-panel flex flex-col justify-between min-h-[265px]" style={{ background: "linear-gradient(to bottom, #fff, #f8fafc)" }}>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100 pb-1.5 font-mono">Tracker Node</h3>
                    {selectedResident ? (
                      <div className="space-y-2.5 text-xs pt-1.5">
                        <p className="text-gray-800 font-semibold"><span className="text-gray-400 font-mono">User:</span> {selectedResident.name}</p>
                        <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl space-y-1 font-mono text-[11px] text-gray-600">
                          <p>• Accuracy: <span className="font-bold text-amber-600">{selectedResident.quizScore}%</span></p>
                          <p>• Jurisdiction: {selectedResident.barangay}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic text-center py-12">Select a row block item to load compliance analytics.</p>
                    )}
                  </div>
                  {selectedResident && (
                    <button type="button" onClick={() => alert(`Alert notice issued.`)} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors mt-2">
                      Issue Reminder Notification
                    </button>
                  )}
                </div>
              </div>

              {/* Secondary Overview Row: Broad Categories Pool & Recent Activity Streams */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="admin-card-panel space-y-3">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <h4 className="text-xs font-bold uppercase text-gray-400 font-mono">Active Content Categories</h4>
                    <button type="button" onClick={() => setActiveTab("categories")} className="text-[10px] font-bold text-gray-500 hover:underline">Configure</button>
                  </div>
                  <div className="space-y-1.5">
                    {categories.map((cat, idx) => (
                      <div key={idx} className="p-2 bg-gray-50 border border-slate-200/60 rounded-xl text-xs text-gray-700 font-medium">
                        • {cat}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-card-panel lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <h4 className="text-xs font-bold uppercase text-gray-400 font-mono">Recent Web Logs Entry</h4>
                    <button type="button" onClick={() => setActiveTab("logs")} className="text-[10px] font-bold text-gray-500 hover:underline">Full Log</button>
                  </div>
                  <div className="space-y-2">
                    {webLogs.slice(0, 3).map((log) => (
                      <div key={log.id} className="p-2 bg-gray-50/60 border border-slate-200/60 rounded-xl text-xs flex justify-between items-center gap-4">
                        <span className="text-gray-700 font-medium truncate">{log.activity}</span>
                        <span className="font-mono text-[10px] text-gray-400 shrink-0">{log.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PAGE VIEW 2: COMPLETE TAB PAGE - COMPLIANCE REGISTRY DIRECTORY             */}
          {/* ========================================================================= */}
          {activeTab === "registry" && (
            <div className="admin-card-panel space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 p-3 rounded-xl border border-slate-200/60">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-gray-500 uppercase font-mono">Filter Scope:</span>
                  <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)} className="p-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none">
                    <option value="All">All Registered Sectors</option>
                    <option value="Balas">Barangay Balas</option>
                    <option value="San Vicente">Barangay San Vicente</option>
                    <option value="Cabalantian">Barangay Cabalantian</option>
                  </select>
                </div>
                <input type="text" placeholder="Search resident identity queries..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-64 p-2 border text-xs rounded-lg focus:outline-none" />
              </div>

              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Resident Name</th>
                      <th>Sector Location</th>
                      <th className="text-center">Syllabus Cleared</th>
                      <th className="text-center">State</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResidents.map((r) => (
                      <tr key={r.id}>
                        <td className="font-semibold text-gray-800">{r.name}</td>
                        <td className="font-mono text-gray-400">{r.barangay}</td>
                        <td className="text-center font-bold text-gray-700">{r.modulesCompleted} Modules Completed</td>
                        <td className="text-center">
                          <span className={r.status === "Ready" ? "badge-ready" : "badge-review"}>{r.status}</span>
                        </td>
                        <td className="text-right">
                          {r.status === "Ready" && (
                            <button type="button" onClick={() => handleVerifyCertificate(r.name)} className="px-2 py-1 text-[11px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-all">Audit QR Code</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PAGE VIEW 3: COMPLETE TAB PAGE - CATEGORIES MANAGEMENT                     */}
          {/* ========================================================================= */}
          {activeTab === "categories" && (
            <div className="max-w-xl mx-auto admin-card-panel space-y-6 animate-in fade-in duration-150">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 border-b pb-1.5">Configure Category Content Records</h3>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">New Category Target Label</label>
                  <input type="text" placeholder="e.g., Flash Flood Evacuation Drills" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none" />
                </div>
                <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors uppercase tracking-wider font-mono">
                  Append Localized Category
                </button>
              </form>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-3 font-mono">Active Target Scopes Pool</p>
                <div className="space-y-2">
                  {categories.map((cat, index) => (
                    <div key={index} className="p-3 bg-gray-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-gray-700 shadow-sm">
                      {cat}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PAGE VIEW 4: COMPLETE TAB PAGE - WEB LOGS AUDIT TRAIL                     */}
          {/* ========================================================================= */}
          {activeTab === "logs" && (
            <div className="admin-card-panel space-y-4 animate-in fade-in duration-150">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 border-b pb-1.5">Unified Activity Log System Database</h3>
              <div className="space-y-2">
                {webLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-sm">
                    <span className="font-semibold text-gray-800">{log.activity}</span>
                    <span className="font-mono text-[10px] text-gray-400">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PAGE VIEW 5: COMPLETE TAB PAGE - TRAINING SYLLABUS REFERENCE              */}
          {activeTab === "syllabus" && (
            <div className="admin-card-panel space-y-4 animate-in fade-in duration-150">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 border-b pb-1.5">Central Master Syllabus Reference (Read-Only View)</h3>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Module Topic Protocol Title</th>
                      <th>Risk Urgency Tiers</th>
                      <th className="text-right">Syllabus Flow Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((mod) => (
                      <tr key={mod.id}>
                        <td className="font-semibold text-gray-800">{mod.title}</td>
                        <td><span className="counter" style={{ padding: '3px 8px', fontSize: '9px' }}>{mod.riskLevel || "Standard"}</span></td>
                        <td className="text-right font-mono font-bold text-gray-500">{mod.flows?.length || 0} structural steps</td>
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