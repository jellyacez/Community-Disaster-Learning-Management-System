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

export default function Dashboard() {
  const { data: session } = authClient.useSession();
  
  const [activeTab, setActiveTab] = useState("overview"); 
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

  const [modules, setModules] = useState(initialModules);
  const [users, setUsers] = useState(initialUsers);
  const [residents, setResidents] = useState(initialResidents);

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
    
    if (currentFlowStep.type === "text" && !currentFlowStep.textContent.trim()) return alert("Please fill in the documentation text block.");
    if (currentFlowStep.type === "video" && !currentFlowStep.videoUrl.trim()) return alert("Please specify the educational video link.");
    if (currentFlowStep.type === "assessment") {
      if (currentFlowStep.assessmentType === "quiz" && currentFlowStep.quizQuestions.length === 0) {
        return alert("Please add at least one multiple choice question.");
      }
      if (currentFlowStep.assessmentType === "situational" && !currentFlowStep.situationalScenario.trim()) {
        return alert("Please describe the real-world scenario details.");
      }
    }

    setStagedFlows([...stagedFlows, currentFlowStep]);
    setCurrentFlowStep({ type: "text", title: "", textContent: "", videoUrl: "", assessmentType: "quiz", quizQuestions: [], situationalScenario: "", situationalGuide: "" });
  };

  const removeFlowStep = (index) => {
    setStagedFlows(stagedFlows.filter((_, i) => i !== index));
  };

  const addQuizQuestionToStep = () => {
    if (!currentQuizQuestion.questionText.trim()) return alert("Please write a question.");
    if (currentQuizQuestion.options.some(opt => !opt.trim())) return alert("Please fill out all choice options.");

    setCurrentFlowStep({
      ...currentFlowStep,
      quizQuestions: [...currentFlowStep.quizQuestions, currentQuizQuestion]
    });

    setCurrentQuizQuestion({
      questionText: "", options: ["", "", "", ""], correctAnswerIndex: 0
    });
  };

  const handleModuleSubmit = (e) => {
    e.preventDefault();
    if (!moduleForm.title || !moduleForm.description) return alert("Please enter the title and description details.");
    if (stagedFlows.length === 0) return alert("Please add at least one step element.");

    if (editingModuleId) {
      setModules(modules.map(m => m.id === editingModuleId ? { ...m, ...moduleForm, flows: stagedFlows } : m));
      alert("Changes saved successfully.");
    } else {
      setModules([...modules, { id: Date.now(), ...moduleForm, flows: stagedFlows }]);
      alert("Module created successfully.");
    }
    setEditingModuleId(null);
    setModuleForm({ title: "", description: "", riskLevel: "Low", status: "Public" });
    setStagedFlows([]);
    setActiveTab("overview");
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) return alert("Please fill out all fields.");
    setUsers([...users, { id: Date.now(), ...userForm }]);
    setUserForm({ name: "", email: "", role: "Responder" });
    setActiveTab("overview");
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
              <h2 className="text-xl font-black font-mono tracking-wider text-gray-900">MDRRMO <span className="text-red-600">HUB</span></h2>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Admin Control Dashboard</p>
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
              Barangay Analytics
            </button>

            <button 
              type="button"
              onClick={() => {
                setEditingModuleId(null);
                setModuleForm({ title: "", description: "", riskLevel: "Low", status: "Public" });
                setStagedFlows([]);
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
              Add Personnel
            </button>
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="admin-card-panel flex items-center gap-3 bg-gray-50/50">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-bold text-white text-sm">
              {session?.user?.name?.[0] || "M"}
            </div>
            <div className="truncate text-xs">
              <p className="font-bold truncate">{session?.user?.name || "MDRRMO Admin"}</p>
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
                <div className="admin-card-panel">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Total Active Modules</p>
                  <p className="text-3xl font-black mt-1 font-mono">{modules.length}</p>
                </div>
                <div className="admin-card-panel">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Registered Responders</p>
                  <p className="text-3xl font-black mt-1 font-mono">{users.length}</p>
                </div>
                <div className="admin-card-panel flex items-center justify-between" style={{ borderLeft: "4px solid #10b981", backgroundColor: "#f0fdf4" }}>
                  <div>
                    <p className="text-[10px] text-emerald-700 uppercase font-bold">System Status</p>
                    <p className="text-md font-black text-emerald-800 font-mono">NORMAL / READY</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <HugeiconsIcon icon={Alert01Icon} className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="admin-card-panel">
                  <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-400 border-b border-gray-100 pb-1.5">Active Modules</h3>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Module Topic</th>
                        <th className="text-center">Steps Inside</th>
                        <th className="text-center">Visibility</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((mod) => (
                        <tr key={mod.id}>
                          <td className="font-semibold max-w-[160px] truncate">{mod.title}</td>
                          <td className="text-center font-mono text-gray-500 font-bold">{mod.flows?.length || 0} Steps</td>
                          <td className="text-center">
                            <span className={mod.status === "Private" ? "badge-review" : "badge-ready"}>
                              {mod.status || "Public"}
                            </span>
                          </td>
                          <td className="text-right">
                            <button type="button" onClick={() => handleEditModuleLoad(mod)} className="px-2 py-0.5 text-[11px] border border-gray-200 bg-white hover:bg-red-50 rounded">View / Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="admin-card-panel">
                  <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-400 border-b border-gray-100 pb-1.5">Registered Personnel</h3>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name & Email</th>
                        <th className="text-right">User Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <p className="font-semibold">{u.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{u.email}</p>
                          </td>
                          <td className="text-right font-mono text-xs uppercase font-bold text-gray-600">{u.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BARANGAY ANALYTICS */}
          {activeTab === "barangay" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="admin-card-panel flex flex-col sm:flex-row items-center justify-between gap-4">
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
                <div className="admin-card-panel">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Monitored Residents</p>
                  <p className="text-2xl font-black mt-1 font-mono">{totalResidentsCount}</p>
                </div>
                <div className="admin-card-panel">
                  <p className="text-[10px] text-emerald-600 uppercase font-bold">Certified Ready</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{readyCount}</p>
                </div>
                <div className="admin-card-panel">
                  <p className="text-[10px] text-amber-500 uppercase font-bold">Average Quiz Accuracy</p>
                  <p className="text-2xl font-black text-amber-500 mt-1 font-mono">{averageScore}%</p>
                </div>
                <div className="admin-card-panel">
                  <p className="text-[10px] text-blue-600 uppercase font-bold">Coverage Rate</p>
                  <p className="text-2xl font-black text-blue-600 mt-1 font-mono">
                    {totalResidentsCount > 0 ? Math.round((filteredResidents.filter(r => r.modulesCompleted > 0).length / totalResidentsCount) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="admin-card-panel lg:col-span-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-400 border-b border-gray-100 pb-1.5">Residential Records</h3>
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
                            <td className="text-right">
                              <button type="button" onClick={() => setSelectedResident(r)} className="px-2 py-0.5 text-[11px] font-medium border border-gray-200 bg-white hover:bg-red-600 hover:text-white rounded transition-colors">View Profile</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="admin-card-panel">
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

          {/* TAB 3: TRAINING MODULES CONSTRUCTOR */}
          {activeTab === "modules" && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-150 pb-12">
              <form onSubmit={handleModuleSubmit} className="space-y-6">
                <div className="admin-card-panel space-y-4">
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-1.5">{editingModuleId ? "Modify Training Module" : "Setup New Training Module"}</h2>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Module Topic Title</label>
                    <input type="text" placeholder="e.g., Protocol for Flash Floods" value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Short Description / Summary</label>
                    <textarea rows="2" placeholder="Brief summary of scopes..." value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Risk Level</label>
                      <select value={moduleForm.riskLevel} onChange={(e) => setModuleForm({ ...moduleForm, riskLevel: e.target.value })} className="w-full p-2 border border-gray-200 text-gray-700 rounded-xl text-xs">
                        <option value="Low">Low Risk</option>
                        <option value="Medium">Medium Risk</option>
                        <option value="High">High Urgency</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Visibility State</label>
                      <select value={moduleForm.status} onChange={(e) => setModuleForm({ ...moduleForm, status: e.target.value })} className="w-full p-2 border border-gray-200 text-gray-700 rounded-xl text-xs">
                        <option value="Public">Public</option>
                        <option value="Private">Private Draft</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="admin-card-panel space-y-3">
                  <h3 className="text-xs font-bold uppercase text-gray-400 border-b pb-1">Module Steps Order Sequence</h3>
                  {stagedFlows.map((flow, index) => (
                    <div key={index} draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={(e) => handleDragOver(e, index)} onDragEnd={handleDragEnd} className="flex items-center justify-between p-2.5 bg-gray-50 border rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <span className="cursor-grab text-gray-400">☰</span>
                        <span className="font-semibold text-gray-800">{flow.title}</span>
                        <span className="counter" style={{ padding: '2px 6px', fontSize: '9px' }}>{flow.type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => moveFlowStep(index, "up")} disabled={index === 0} className="px-1.5 py-0.5 bg-white border text-[10px] rounded">▲</button>
                        <button type="button" onClick={() => moveFlowStep(index, "down")} disabled={index === stagedFlows.length - 1} className="px-1.5 py-0.5 bg-white border text-[10px] rounded">▼</button>
                        <button type="button" onClick={() => removeFlowStep(index)} className="text-red-600 ml-2 hover:underline">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="admin-card-panel space-y-4">
                  <h3 className="text-xs font-bold uppercase text-gray-400 border-b pb-1">Step Content Configuration Builder</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Step Title Name..." value={currentFlowStep.title} onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, title: e.target.value })} className="p-2 border border-gray-200 rounded-xl text-xs focus:outline-none" />
                    <select value={currentFlowStep.type} onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, type: e.target.value })} className="p-2 border border-gray-200 rounded-xl text-xs">
                      <option value="text">Written Material</option>
                      <option value="video">Video Training Link</option>
                      <option value="assessment">Assessment Verification</option>
                    </select>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 border-dashed rounded-xl space-y-3">
                    {currentFlowStep.type === "text" && (
                      <textarea rows="3" placeholder="Type instructions here..." value={currentFlowStep.textContent} onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, textContent: e.target.value })} className="w-full p-2 bg-white border rounded-xl text-xs focus:outline-none" />
                    )}
                    {currentFlowStep.type === "video" && (
                      <input type="url" placeholder="Paste embed video asset link..." value={currentFlowStep.videoUrl} onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, videoUrl: e.target.value })} className="w-full p-2 bg-white border rounded-xl text-xs focus:outline-none" />
                    )}
                    {currentFlowStep.type === "assessment" && (
                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-600">Verification Type Selection:</span>
                          <select value={currentFlowStep.assessmentType} onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, assessmentType: e.target.value })} className="p-1 border rounded bg-white">
                            <option value="quiz">Multiple Choice Quiz</option>
                            <option value="situational">Situational Scenario Case</option>
                          </select>
                        </div>
                        {currentFlowStep.assessmentType === "quiz" && (
                          <div className="space-y-2 border-t pt-2">
                            <input type="text" placeholder="Write quiz question text block..." value={currentQuizQuestion.questionText} onChange={(e) => setCurrentQuizQuestion({ ...currentQuizQuestion, questionText: e.target.value })} className="w-full p-2 bg-white border rounded-xl text-xs" />
                            <div className="grid grid-cols-2 gap-2">
                              {currentQuizQuestion.options.map((opt, oIdx) => (
                                <input key={oIdx} type="text" placeholder={`Choice Answer Option ${oIdx + 1}`} value={opt} onChange={(e) => {
                                  const updated = [...currentQuizQuestion.options];
                                  updated[oIdx] = e.target.value;
                                  setCurrentQuizQuestion({ ...currentQuizQuestion, options: updated });
                                }} className="p-1.5 bg-white border rounded-xl text-xs" />
                              ))}
                            </div>
                            <div className="flex items-center justify-between gap-4 pt-1">
                              <select value={currentQuizQuestion.correctAnswerIndex} onChange={(e) => setCurrentQuizQuestion({ ...currentQuizQuestion, correctAnswerIndex: parseInt(e.target.value) })} className="p-1 border rounded bg-white text-[11px]">
                                <option value={0}>Option 1 is correct</option>
                                <option value={1}>Option 2 is correct</option>
                                <option value={2}>Option 3 is correct</option>
                                <option value={3}>Option 4 is correct</option>
                              </select>
                              <button type="button" onClick={addQuizQuestionToStep} className="px-3 py-1 bg-white border rounded text-[11px] font-bold text-gray-700">+ Save Question</button>
                            </div>
                          </div>
                        )}
                        {currentFlowStep.assessmentType === "situational" && (
                          <div className="space-y-2 border-t pt-2">
                            <textarea rows="2" placeholder="Describe crisis scenario circumstances..." value={currentFlowStep.situationalScenario} onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, situationalScenario: e.target.value })} className="w-full p-2 bg-white border rounded-xl text-xs" />
                            <textarea rows="1" placeholder="Officer check rubric grading guides..." value={currentFlowStep.situationalGuide} onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, situationalGuide: e.target.value })} className="w-full p-2 bg-white border rounded-xl text-xs" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={addStepToFlow} className="w-full py-2 bg-gray-100 hover:bg-gray-200 border text-xs font-bold rounded-xl text-gray-700">+ Save Content Step Element</button>
                </div>
                <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm">{editingModuleId ? "Commit Changes to Syllabus" : "Publish Training Module Layout"}</button>
              </form>
            </div>
          )}

          {/* TAB 4: ADD PERSONNEL */}
          {activeTab === "users" && (
            <div className="max-w-md mx-auto admin-card-panel space-y-4 animate-in fade-in duration-150">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-1.5">Register District Personnel</h2>
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
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">System Scope Role Tiers</label>
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full p-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs focus:outline-none">
                    <option value="Field Responder">Field Responder</option>
                    <option value="MDRRMO Officer">MDRRMO Communications Officer</option>
                    <option value="System Admin">System Administrator</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm">Save Registry Parameters</button>
              </form>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}