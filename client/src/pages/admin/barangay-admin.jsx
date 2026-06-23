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

// 1. Import the separated mock data here
import { initialModules, initialUsers, initialResidents } from "./mockData";

export default function Dashboard() {
  const { data: session } = authClient.useSession();
  
  const [activeTab, setActiveTab] = useState("barangay"); 
  const [selectedBarangay, setSelectedBarangay] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResident, setSelectedResident] = useState(null);



  const [editingModuleId, setEditingModuleId] = useState(null);
  const [moduleForm, setModuleForm] = useState({ 
    title: "", 
    description: "", 
    riskLevel: "Low",
    status: "Public"
  });

  const [stagedFlows, setStagedFlows] = useState([]);
  const [currentFlowStep, setCurrentFlowStep] = useState({
    type: "text", title: "", textContent: "", videoUrl: "", assessmentType: "quiz", quizQuestions: [], situationalScenario: "", situationalGuide: ""
  });

  const [currentQuizQuestion, setCurrentQuizQuestion] = useState({
    questionText: "", options: ["", "", "", ""], correctAnswerIndex: 0
  });

  const [userForm, setUserForm] = useState({ name: "", email: "", role: "Responder" });

  // 2. Pass the imported mock datasets as the initial states
  const [modules, setModules] = useState(initialModules);
  const [users, setUsers] = useState(initialUsers);
  const [residents, setResidents] = useState(initialResidents);

  // ... rest of your dashboard code logic remains exactly the same ...

  // Click & Drag simulation handlers
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    const updatedFlows = [...stagedFlows];
    const itemToMove = updatedFlows[draggedItemIndex];
    
    updatedFlows.splice(draggedItemIndex, 1);
    updatedFlows.splice(index, 0, itemToMove);
    
    setDraggedItemIndex(index);
    setStagedFlows(updatedFlows);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  const moveFlowStep = (index, direction) => {
    const updated = [...stagedFlows];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setStagedFlows(updated);
  };

  const handleEditModuleLoad = (mod) => {
    setEditingModuleId(mod.id);
    setModuleForm({ title: mod.title, description: mod.description, riskLevel: mod.riskLevel, status: mod.status || "Public" });
    setStagedFlows(mod.flows || []);
    setActiveTab("modules");
  };

  const addStepToFlow = () => {
    if (!currentFlowStep.title.trim()) return alert("Please enter a step name.");
    setStagedFlows([...stagedFlows, currentFlowStep]);
    setCurrentFlowStep({ type: "text", title: "", textContent: "", videoUrl: "", assessmentType: "quiz", quizQuestions: [], situationalScenario: "", situationalGuide: "" });
  };

  const removeFlowStep = (index) => {
    setStagedFlows(stagedFlows.filter((_, i) => i !== index));
  };

  const handleModuleSubmit = (e) => {
    e.preventDefault();
    if (editingModuleId) {
      setModules(modules.map(m => m.id === editingModuleId ? { ...m, ...moduleForm, flows: stagedFlows } : m));
    } else {
      setModules([...modules, { id: Date.now(), ...moduleForm, flows: stagedFlows }]);
    }
    setEditingModuleId(null);
    setModuleForm({ title: "", description: "", riskLevel: "Low", status: "Public" });
    setStagedFlows([]);
    setActiveTab("overview");
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    setUsers([...users, { id: Date.now(), ...userForm }]);
    setUserForm({ name: "", email: "", role: "Responder" });
    setActiveTab("overview");
  };

  const handleLogout = async () => {
    sessionStorage.setItem("isLoggingOut", "true");
    await authClient.signOut();
    window.location.href = "/signin";
  };

  // Filter residents based on drop-down selections and active text queries
  const filteredResidents = residents.filter(r => {
    const matchesBarangay = selectedBarangay === "All" || r.barangay === selectedBarangay;
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBarangay && matchesSearch;
  });

  // Data calculations for Barangay Dashboard Charts
  const totalResidentsCount = filteredResidents.length;
  const readyCount = filteredResidents.filter(r => r.status === "Ready").length;
  const averageScore = totalResidentsCount > 0 
    ? Math.round(filteredResidents.reduce((acc, r) => acc + r.quizScore, 0) / totalResidentsCount) 
    : 0;

  return (
    <div className="min-h-screen flex bg-[#0b0f19] text-gray-100 font-sans">
      
      {/* Sidebar Layout */}
      <aside className="w-72 h-screen sticky top-0 bg-[#111827] flex flex-col justify-between p-6 border-r border-[#1f2937] flex-shrink-0">
        <div>
          <div className="mb-8 border-b border-[#1f2937] pb-5">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <h2 className="text-2xl font-black text-white tracking-wider font-mono">MDRRM <span className="text-orange-500">HUB</span></h2>
            </div>
            <p className="text-xs text-gray-400 font-medium tracking-widest mt-1 uppercase">Admin Control Dashboard</p>
          </div>

          <nav className="space-y-1.5">
            <button 
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-all text-sm ${activeTab === "overview" ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg" : "text-gray-400 hover:bg-[#1f2937] hover:text-white"}`}
            >
              <HugeiconsIcon icon={DashboardSquare01Icon} className="w-5 h-5" />
              Main Overview
            </button>

            <button 
              onClick={() => setActiveTab("barangay")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-all text-sm ${activeTab === "barangay" ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg" : "text-gray-400 hover:bg-[#1f2937] hover:text-white"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              Barangay Analytics
            </button>

            <button 
              onClick={() => {
                setEditingModuleId(null);
                setModuleForm({ title: "", description: "", riskLevel: "Low", status: "Public" });
                setStagedFlows([]);
                setActiveTab("modules");
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-all text-sm ${activeTab === "modules" ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg" : "text-gray-400 hover:bg-[#1f2937] hover:text-white"}`}
            >
              <HugeiconsIcon icon={FolderAddIcon} className="w-5 h-5" />
              {editingModuleId ? "Edit Active Module" : "Create New Module"}
            </button>

            <button 
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-all text-sm ${activeTab === "users" ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg" : "text-gray-400 hover:bg-[#1f2937] hover:text-white"}`}
            >
              <HugeiconsIcon icon={UserAddIcon} className="w-5 h-5" />
              Add Personnel
            </button>
          </nav>
        </div>

        <div className="border-t border-[#1f2937] pt-5 space-y-4">
          <div className="flex items-center gap-3 bg-[#1f2937]/50 p-3 rounded-xl border border-[#374151]/30">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-bold text-white text-md">
              {session?.user?.name?.[0] || "A"}
            </div>
            <div className="truncate">
              <p className="text-sm font-bold text-white truncate">{session?.user?.name || "MDRRM Admin"}</p>
              <p className="text-xs text-gray-400 truncate">{session?.user?.email || "admin.bacolor@mdrrmo.gov.ph"}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-red-400 bg-[#1f2937]/30 hover:bg-red-950/20 rounded-xl border border-[#374151]/40 transition-all">
            <HugeiconsIcon icon={Logout01Icon} className="w-4 h-4" /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="bg-[#111827] h-20 border-b border-[#1f2937] flex items-center justify-between px-8 flex-shrink-0">
          <div>
            <h1 className="text-md font-bold text-white tracking-wide uppercase font-mono">
              Municipal Disaster Risk Reduction and Management Center
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Staff & Responder Training Hub Portal</p>
          </div>
        </header>

        <div className="p-8 flex-1 bg-[#0b0f19]">
          
          {/* TAB 1: NEW BARANGAY ADMIN VIEW */}
          {activeTab === "barangay" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Filter Controls Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#111827] p-4 rounded-xl border border-[#1f2937]">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Location filter:</label>
                  <select 
                    value={selectedBarangay} 
                    onChange={(e) => setSelectedBarangay(e.target.value)}
                    className="p-2 bg-[#0b0f19] border border-[#1f2937] text-xs text-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  >
                    <option value="All">All Barangays</option>
                    <option value="Balas">Barangay Balas</option>
                    <option value="San Vicente">Barangay San Vicente</option>
                    <option value="Cabalantian">Barangay Cabalantian</option>
                  </select>
                </div>
                
                <input 
                  type="text" 
                  placeholder="Search resident name or training status..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-72 p-2 px-3 bg-[#0b0f19] border border-[#1f2937] text-xs text-white rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Responsive Micro Charts / Metrics Panel */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#111827] p-5 rounded-xl border border-[#1f2937]">
                  <p className="text-xs text-gray-400 uppercase font-bold">Monitored Residents</p>
                  <p className="text-3xl font-black text-white mt-1 font-mono">{totalResidentsCount}</p>
                  <div className="w-full bg-[#0b0f19] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-orange-500 h-full" style={{ width: "100%" }} />
                  </div>
                </div>

                <div className="bg-[#111827] p-5 rounded-xl border border-[#1f2937]">
                  <p className="text-xs text-gray-400 uppercase font-bold">Certified Ready Status</p>
                  <p className="text-3xl font-black text-emerald-400 mt-1 font-mono">{readyCount}</p>
                  <div className="w-full bg-[#0b0f19] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: totalResidentsCount > 0 ? `${(readyCount / totalResidentsCount) * 100}%` : "0%" }} />
                  </div>
                </div>

                <div className="bg-[#111827] p-5 rounded-xl border border-[#1f2937]">
                  <p className="text-xs text-gray-400 uppercase font-bold">Average Quiz Performance</p>
                  <p className="text-3xl font-black text-amber-400 mt-1 font-mono">{averageScore}%</p>
                  <div className="w-full bg-[#0b0f19] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${averageScore}%` }} />
                  </div>
                </div>

                <div className="bg-[#111827] p-5 rounded-xl border border-[#1f2937]">
                  <p className="text-xs text-gray-400 uppercase font-bold">Training Coverage Rate</p>
                  <p className="text-3xl font-black text-blue-400 mt-1 font-mono">
                    {totalResidentsCount > 0 ? Math.round((filteredResidents.filter(r => r.modulesCompleted > 0).length / totalResidentsCount) * 100) : 0}%
                  </p>
                  <div className="w-full bg-[#0b0f19] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: "65%" }} />
                  </div>
                </div>
              </div>

              {/* Main Workspace split panel layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Participant Data Registry Table */}
                <div className="bg-[#111827] p-6 rounded-2xl border border-[#1f2937] shadow-lg lg:col-span-2">
                  <h3 className="text-sm font-bold text-white mb-4 tracking-wide border-b border-[#1f2937] pb-2">Residential Participants Records</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#1f2937] text-gray-400 font-semibold">
                          <th className="pb-3">Resident Name</th>
                          <th className="pb-3">Barangay Sector</th>
                          <th className="pb-3 text-center">Modules Finished</th>
                          <th className="pb-3 text-center">Safety Rating</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2937]/50">
                        {filteredResidents.map((r) => (
                          <tr key={r.id} className="text-gray-300 hover:bg-[#1f2937]/30 transition-colors">
                            <td className="py-3 font-semibold text-white">{r.name}</td>
                            <td className="py-3 font-mono text-gray-400">{r.barangay}</td>
                            <td className="py-3 text-center font-bold text-amber-400">{r.modulesCompleted} Modules</td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === "Ready" ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : r.status === "Needs Review" ? "bg-red-950 text-red-400 border border-red-900" : "bg-gray-800 text-gray-400"}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button 
                                type="button" 
                                onClick={() => setSelectedResident(r)}
                                className="px-2.5 py-1 bg-[#1f2937] hover:bg-orange-600 hover:text-white text-gray-300 border border-[#374151] rounded transition-all"
                              >
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Inspect Target Detail Sidebar Panel */}
                <div className="bg-[#111827] p-6 rounded-2xl border border-[#1f2937] shadow-lg">
                  <h3 className="text-sm font-bold text-white mb-3 tracking-wide border-b border-[#1f2937] pb-2">Participant Details Breakdown</h3>
                  {selectedResident ? (
                    <div className="space-y-4 text-xs animate-in fade-in duration-150">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Full Name</p>
                        <p className="text-sm font-bold text-white mt-0.5">{selectedResident.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Barangay</p>
                          <p className="font-semibold text-gray-200 mt-0.5">{selectedResident.barangay}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Contact Node</p>
                          <p className="font-semibold text-gray-200 mt-0.5 font-mono">{selectedResident.contact}</p>
                        </div>
                      </div>
                      <div className="p-3 bg-[#0b0f19] border border-[#1f2937] rounded-xl space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Modules Cleared:</span>
                          <span className="font-bold text-white font-mono">{selectedResident.modulesCompleted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Average Quiz Accuracy:</span>
                          <span className="font-bold text-amber-400 font-mono">{selectedResident.quizScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Activity Check:</span>
                          <span className="text-gray-400 font-mono">{selectedResident.lastActive}</span>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => alert(`Alert message broadcast dispatched to phone node: ${selectedResident.contact}`)}
                        className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-all"
                      >
                        Send Direct Emergency Alert Notice
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-8 border border-dashed border-[#1f2937] rounded-xl">
                      Select a resident profile card from the dashboard table list to view full tracking metrics details.
                    </p>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: OVERVIEW ARTIFACT */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#111827] p-6 rounded-2xl border border-[#1f2937] shadow-lg">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Active Modules</p>
                  <p className="text-4xl font-black text-white mt-2 font-mono">{modules.length}</p>
                </div>
                <div className="bg-[#111827] p-6 rounded-2xl border border-[#1f2937] shadow-lg">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Registered Responders</p>
                  <p className="text-4xl font-black text-white mt-2 font-mono">{users.length}</p>
                </div>
                <div className="bg-[#111827] p-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 flex items-center justify-between shadow-lg">
                  <div>
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">System Status</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">NORMAL / READY</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <HugeiconsIcon icon={Alert01Icon} className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#111827] p-6 rounded-2xl border border-[#1f2937] shadow-lg">
                  <h3 className="text-md font-bold text-white mb-4 tracking-wide border-b border-[#1f2937] pb-2">Active Modules</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[#1f2937] text-gray-400 font-semibold">
                          <th className="pb-3">Module Topic</th>
                          <th className="pb-3 text-center">Steps Inside</th>
                          <th className="pb-3 text-center">Visibility</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2937]/50">
                        {modules.map((mod) => (
                          <tr key={mod.id} className="text-gray-300 hover:bg-[#1f2937]/30 transition-colors">
                            <td className="py-3.5 font-semibold text-white max-w-[160px] truncate">{mod.title}</td>
                            <td className="py-3.5 text-center font-mono text-amber-400 font-bold">{mod.flows?.length || 0} Steps</td>
                            <td className="py-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs ${mod.status === "Private" ? "bg-gray-800 text-gray-400 border border-gray-700" : "bg-emerald-950 text-emerald-400 border border-emerald-900"}`}>
                                {mod.status || "Public"}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              <button onClick={() => handleEditModuleLoad(mod)} className="px-3 py-1 bg-orange-600/20 text-orange-400 hover:bg-orange-600 hover:text-white border border-orange-500/30 rounded-lg text-xs font-semibold transition-all">View / Edit</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-[#111827] p-6 rounded-2xl border border-[#1f2937] shadow-lg">
                  <h3 className="text-md font-bold text-white mb-4 tracking-wide border-b border-[#1f2937] pb-2">Registered Personnel</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[#1f2937] text-gray-400 font-semibold">
                          <th className="pb-3">Name & Email</th>
                          <th className="pb-3 text-right">User Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2937]/50">
                        {users.map((u) => (
                          <tr key={u.id} className="text-gray-300 hover:bg-[#1f2937]/30 transition-colors">
                            <td className="py-3.5">
                              <p className="font-semibold text-white">{u.name}</p>
                              <p className="text-xs text-gray-400 font-mono">{u.email}</p>
                            </td>
                            <td className="py-3.5 text-right text-orange-400 font-mono text-xs uppercase">{u.role}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WORKSPACE CONSTRUCTOR FOR MODULES */}
          {activeTab === "modules" && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-150 pb-12">
              <form onSubmit={handleModuleSubmit} className="space-y-6">
                <div className="bg-[#111827] p-8 rounded-2xl border border-[#1f2937] shadow-xl space-y-5">
                  <div className="border-b border-[#1f2937] pb-3 flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-bold text-white">{editingModuleId ? "Modify Existing Training Module" : "Setup New Training Module"}</h2>
                      <p className="text-xs text-gray-400">Fill in the basic title information and risk context below.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Module Topic Title</label>
                      <input type="text" placeholder="e.g., Protocol for Flash Floods" value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] rounded-xl text-sm text-white focus:outline-none focus:border-orange-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Short Description</label>
                      <textarea rows="2" placeholder="Brief summary explaining content..." value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] rounded-xl text-sm text-white focus:outline-none focus:border-orange-500" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Risk Urgency Level</label>
                        <select value={moduleForm.riskLevel} onChange={(e) => setModuleForm({ ...moduleForm, riskLevel: e.target.value })} className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] text-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500">
                          <option value="Low">Low Risk</option>
                          <option value="Medium">Medium Risk</option>
                          <option value="High">High Urgency</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Visibility State</label>
                        <select value={moduleForm.status} onChange={(e) => setModuleForm({ ...moduleForm, status: e.target.value })} className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] text-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500">
                          <option value="Public">Public</option>
                          <option value="Private">Private</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#111827] p-8 rounded-2xl border border-[#1f2937] shadow-xl space-y-4">
                  <h3 className="text-md font-bold text-white">Module Steps & Sequence Order</h3>
                  <div className="space-y-2">
                    {stagedFlows.map((flow, index) => (
                      <div key={index} draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={(e) => handleDragOver(e, index)} onDragEnd={handleDragEnd} className="flex items-center justify-between p-3.5 bg-[#0b0f19] border border-[#1f2937] rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="cursor-grab text-gray-500 font-mono">☰</div>
                          <p className="text-sm text-white">{flow.title}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => moveFlowStep(index, "up")} className="px-2 py-1 bg-[#111827] text-xs">▲</button>
                          <button type="button" onClick={() => moveFlowStep(index, "down")} className="px-2 py-1 bg-[#111827] text-xs">▼</button>
                          <button type="button" onClick={() => removeFlowStep(index)} className="ml-2 px-2 py-1 bg-red-950/20 text-red-400 rounded text-xs">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111827] p-8 rounded-2xl border border-[#1f2937] shadow-xl space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Step Title" value={currentFlowStep.title} onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, title: e.target.value })} className="w-full p-3 bg-[#0b0f19] border border-[#1f2937] rounded-xl text-sm focus:outline-none" />
                    <select value={currentFlowStep.type} onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, type: e.target.value })} className="w-full p-3 bg-[#0b0f19] border border-[#1f2937] rounded-xl text-sm">
                      <option value="text">Text Material</option>
                      <option value="video">Video Training</option>
                      <option value="assessment">Assessment Check</option>
                    </select>
                  </div>
                  <button type="button" onClick={addStepToFlow} className="w-full py-2.5 bg-[#1f2937] text-xs text-white border border-[#374151] rounded-xl">+ Save Step into Module List</button>
                </div>

                <button type="submit" className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl text-sm shadow-lg">Save All Changes to Module Layout</button>
              </form>
            </div>
          )}

          {/* TAB 4: ADD PERSONNEL */}
          {activeTab === "users" && (
            <div className="max-w-xl mx-auto bg-[#111827] p-8 rounded-2xl border border-[#1f2937] shadow-xl animate-in fade-in duration-150">
              <h2 className="text-lg font-bold text-white mb-4">Register District Personnel</h2>
              <form onSubmit={handleUserSubmit} className="space-y-5">
                <input type="text" placeholder="Personnel Name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] rounded-xl text-sm text-white focus:outline-none" />
                <input type="email" placeholder="Official Email Address" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] rounded-xl text-sm text-white focus:outline-none" />
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] text-gray-300 rounded-xl text-sm">
                  <option value="Field Responder">Field Responder</option>
                  <option value="MDRRM Officer">MDRRM Communications Officer</option>
                </select>
                <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl text-sm shadow-md">Register User Credentials</button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}