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
import { initialModules, initialUsers, initialResidents } from "./mockData";

export default function Dashboard() {
  const { data: session } = authClient.useSession();
  const [activeTab, setActiveTab] = useState("overview");

  const [modules, setModules] = useState(initialModules);
  const [users, setUsers] = useState(initialUsers);
  const [residents, setResidents] = useState(initialResidents);

  // Core information for the module being created or edited
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [moduleForm, setModuleForm] = useState({ 
    title: "", 
    description: "", 
    riskLevel: "Low",
    status: "Public" // 'Public' or 'Private'
  });

  // Steps added to the current module layout
  const [stagedFlows, setStagedFlows] = useState([]);
  
  // Staging area for a single step currently being written
  const [currentFlowStep, setCurrentFlowStep] = useState({
    type: "text", // 'text' | 'video' | 'assessment'
    title: "",
    textContent: "",
    videoUrl: "",
    assessmentType: "quiz", // 'quiz' | 'situational'
    quizQuestions: [], 
    situationalScenario: "",
    situationalGuide: ""
  });

  // Staging area for single quiz questions
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState({
    questionText: "",
    options: ["", "", "", ""],
    correctAnswerIndex: 0
  });

  const [userForm, setUserForm] = useState({ name: "", email: "", role: "Responder" });

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

  // Fallback reordering buttons
  const moveFlowStep = (index, direction) => {
    const updated = [...stagedFlows];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setStagedFlows(updated);
  };

  // Load module data for editing
  const handleEditModuleLoad = (mod) => {
    setEditingModuleId(mod.id);
    setModuleForm({
      title: mod.title,
      description: mod.description,
      riskLevel: mod.riskLevel,
      status: mod.status || "Public"
    });
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
    setCurrentFlowStep({
      type: "text",
      title: "",
      textContent: "",
      videoUrl: "",
      assessmentType: "quiz",
      quizQuestions: [],
      situationalScenario: "",
      situationalGuide: ""
    });
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
      questionText: "",
      options: ["", "", "", ""],
      correctAnswerIndex: 0
    });
  };

  const handleModuleSubmit = (e) => {
    e.preventDefault();
    if (!moduleForm.title || !moduleForm.description) return alert("Please enter the title and description details.");
    if (stagedFlows.length === 0) return alert("Please add at least one step element to this module configuration.");

    if (editingModuleId) {
      setModules(modules.map(m => m.id === editingModuleId ? { ...m, ...moduleForm, flows: stagedFlows } : m));
      alert("Changes saved successfully.");
    } else {
      const newModule = {
        id: Date.now(),
        ...moduleForm,
        flows: stagedFlows
      };
      setModules([...modules, newModule]);
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

  return (
    <div className="min-h-screen flex bg-[#0b0f19] text-gray-100 font-sans">
      
      {/* Sidebar Layout - Static Constant Size Viewport Lock */}
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
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-red-400 bg-[#1f2937]/30 hover:bg-red-950/20 rounded-xl border border-[#374151]/40 transition-all"
          >
            <HugeiconsIcon icon={Logout01Icon} className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main View Area - Independent Scroll Container */}
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
          
          {/* VIEW TAB 1: MAIN OVERVIEW */}
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

              {/* Data Lists Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Modules Management Card */}
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
                              <button 
                                onClick={() => handleEditModuleLoad(mod)}
                                className="px-3 py-1 bg-orange-600/20 text-orange-400 hover:bg-orange-600 hover:text-white border border-orange-500/30 rounded-lg text-xs font-semibold transition-all"
                              >
                                View / Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Personnel Management Card */}
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

          {/* VIEW TAB 2: CREATE / EDIT MODULE WORKSPACE */}
          {activeTab === "modules" && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-150 pb-12">
              <form onSubmit={handleModuleSubmit} className="space-y-6">
                
                {/* Module Core Settings */}
                <div className="bg-[#111827] p-8 rounded-2xl border border-[#1f2937] shadow-xl space-y-5">
                  <div className="border-b border-[#1f2937] pb-3 flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-bold text-white">{editingModuleId ? "Modify Existing Training Module" : "Setup New Training Module"}</h2>
                      <p className="text-xs text-gray-400">Fill in the basic title information and risk context below.</p>
                    </div>
                    {editingModuleId && (
                      <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-lg font-bold">
                        Editing Mode
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Module Topic Title</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Protocol for Flash Floods"
                        value={moduleForm.title}
                        onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                        className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Short Description / Purpose</label>
                      <textarea 
                        rows="2" 
                        placeholder="Brief summary explaining what the users will learn in this section..."
                        value={moduleForm.description}
                        onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                        className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Risk Urgency Level</label>
                        <select 
                          value={moduleForm.riskLevel}
                          onChange={(e) => setModuleForm({ ...moduleForm, riskLevel: e.target.value })}
                          className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] text-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                        >
                          <option value="Low">Low Risk Protocol</option>
                          <option value="Medium">Medium Risk Protocol</option>
                          <option value="High">High Urgency Danger Protocol</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Module Visibility State</label>
                        <select 
                          value={moduleForm.status}
                          onChange={(e) => setModuleForm({ ...moduleForm, status: e.target.value })}
                          className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] text-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                        >
                          <option value="Public">Public (Immediately open to staff)</option>
                          <option value="Private">Private (Keep hidden as a draft)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Module Steps & Drag Sequence Container */}
                <div className="bg-[#111827] p-8 rounded-2xl border border-[#1f2937] shadow-xl space-y-4">
                  <div className="border-b border-[#1f2937] pb-3">
                    <h3 className="text-md font-bold text-white">Module Steps & Sequence Order</h3>
                    <p className="text-xs text-gray-400">Click and hold the ☰ handles to drag items up or down to instantly rearrange the training sequence.</p>
                  </div>

                  {stagedFlows.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-[#1f2937] rounded-xl text-xs text-gray-500 bg-[#0b0f19]/30">
                      No steps added yet. Setup a step using the generator form below.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stagedFlows.map((flow, index) => (
                        <div 
                          key={index} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center justify-between p-3.5 bg-[#0b0f19] border rounded-xl select-none transition-all ${draggedItemIndex === index ? "border-orange-500 opacity-50 shadow-2xl scale-95" : "border-[#1f2937] hover:border-gray-700"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 text-md p-1 px-2 font-mono bg-[#111827] rounded border border-[#1f2937]">
                              ☰
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                <span className="text-gray-500 text-xs mr-1">Step {index + 1}:</span> {flow.title}
                              </p>
                              <span className="text-[10px] font-mono font-bold uppercase bg-[#1f2937] text-orange-400 px-2 py-0.5 rounded border border-[#374151]/30">
                                {flow.type} {flow.type === "assessment" && `(${flow.assessmentType})`}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button 
                              type="button" 
                              onClick={() => moveFlowStep(index, "up")}
                              disabled={index === 0}
                              className="px-2 py-1 bg-[#111827] disabled:opacity-20 rounded text-[11px] text-gray-400"
                            >
                              ▲
                            </button>
                            <button 
                              type="button" 
                              onClick={() => moveFlowStep(index, "down")}
                              disabled={index === stagedFlows.length - 1}
                              className="px-2 py-1 bg-[#111827] disabled:opacity-20 rounded text-[11px] text-gray-400"
                            >
                              ▼
                            </button>
                            <button 
                              type="button" 
                              onClick={() => removeFlowStep(index)}
                              className="ml-2 px-2.5 py-1 bg-red-950/20 text-red-400 hover:bg-red-900/30 rounded text-xs font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step Creation Panel Forms */}
                <div className="bg-[#111827] p-8 rounded-2xl border border-[#1f2937] shadow-xl space-y-5">
                  <div className="border-b border-[#1f2937] pb-3">
                    <h3 className="text-md font-bold text-white">Step Form Builder</h3>
                    <p className="text-xs text-gray-400">Configure a text, video, or review assessment element block to slot into your layout list.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Step Name / Title</label>
                      <input 
                        type="text"
                        placeholder="e.g., Lesson 1: Water Safety Level Check"
                        value={currentFlowStep.title}
                        onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, title: e.target.value })}
                        className="w-full p-3 bg-[#0b0f19] border border-[#1f2937] rounded-xl text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">What kind of content is this?</label>
                      <select
                        value={currentFlowStep.type}
                        onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, type: e.target.value })}
                        className="w-full p-3 bg-[#0b0f19] border border-[#1f2937] rounded-xl text-sm focus:outline-none focus:border-orange-500"
                      >
                        <option value="text">Written Text Material / Instructions</option>
                        <option value="video">Educational Training Video</option>
                        <option value="assessment">Evaluation Assessment Check</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-[#0b0f19]/60 p-5 rounded-xl border border-[#1f2937] border-dashed space-y-4">
                    
                    {/* TEXT OPTION */}
                    {currentFlowStep.type === "text" && (
                      <div>
                        <label className="block text-xs font-bold text-orange-400 mb-2">Write Content Text Here</label>
                        <textarea
                          rows="4"
                          placeholder="Type or paste the instructions that the responder needs to read..."
                          value={currentFlowStep.textContent}
                          onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, textContent: e.target.value })}
                          className="w-full p-3 bg-[#111827] border border-[#1f2937] rounded-xl text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    )}

                    {/* VIDEO OPTION */}
                    {currentFlowStep.type === "video" && (
                      <div>
                        <label className="block text-xs font-bold text-orange-400 mb-2">Video Asset URL Link</label>
                        <input
                          type="url"
                          placeholder="Paste link here (e.g., https://youtube.com/...)"
                          value={currentFlowStep.videoUrl}
                          onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, videoUrl: e.target.value })}
                          className="w-full p-3 bg-[#111827] border border-[#1f2937] rounded-xl text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    )}

                    {/* ASSESSMENT OPTIONS */}
                    {currentFlowStep.type === "assessment" && (
                      <div className="space-y-4">
                        <div className="p-3 bg-[#111827] rounded-xl border border-[#1f2937] flex items-center justify-between">
                          <div>
                            <label className="block text-xs font-bold text-amber-400">Assessment Selection Type</label>
                            <p className="text-[11px] text-gray-400">Choose between a traditional multiple choice quiz or a text situational problem description.</p>
                          </div>
                          <select
                            value={currentFlowStep.assessmentType}
                            onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, assessmentType: e.target.value })}
                            className="bg-[#0b0f19] p-2 border border-[#1f2937] rounded-lg text-xs text-gray-300"
                          >
                            <option value="quiz">Multiple Choice Quiz Format</option>
                            <option value="situational">Situational Scenario Problem Format</option>
                          </select>
                        </div>

                        {/* QUIZ FORMAT WRAPPER */}
                        {currentFlowStep.assessmentType === "quiz" && (
                          <div className="space-y-3 bg-[#111827]/40 p-4 rounded-xl border border-[#1f2937]">
                            <p className="text-xs font-bold text-gray-400 uppercase">Build Quiz Question ({currentFlowStep.quizQuestions.length} Saved to Step)</p>
                            
                            <div className="space-y-2">
                              <input 
                                type="text"
                                placeholder="Type the question text here..."
                                value={currentQuizQuestion.questionText}
                                onChange={(e) => setCurrentQuizQuestion({ ...currentQuizQuestion, questionText: e.target.value })}
                                className="w-full p-2.5 bg-[#111827] border border-[#1f2937] text-xs rounded-lg"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                {currentQuizQuestion.options.map((opt, i) => (
                                  <input 
                                    key={i}
                                    type="text"
                                    placeholder={`Choice Answer Option ${i + 1}`}
                                    value={opt}
                                    onChange={(e) => {
                                      const updated = [...currentQuizQuestion.options];
                                      updated[i] = e.target.value;
                                      setCurrentQuizQuestion({ ...currentQuizQuestion, options: updated });
                                    }}
                                    className="p-2 bg-[#111827] border border-[#1f2937] text-xs rounded-lg"
                                  />
                                ))}
                              </div>
                              <div className="flex items-center justify-between gap-4 pt-1">
                                <select
                                  value={currentQuizQuestion.correctAnswerIndex}
                                  onChange={(e) => setCurrentQuizQuestion({ ...currentQuizQuestion, correctAnswerIndex: parseInt(e.target.value) })}
                                  className="p-1.5 bg-[#0b0f19] border border-[#1f2937] text-xs text-gray-400 rounded-lg"
                                >
                                  <option value={0}>Option 1 is correct answer</option>
                                  <option value={1}>Option 2 is correct answer</option>
                                  <option value={2}>Option 3 is correct answer</option>
                                  <option value={3}>Option 4 is correct answer</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={addQuizQuestionToStep}
                                  className="px-3 py-1.5 bg-[#1f2937] text-orange-400 text-xs font-bold rounded-lg border border-orange-500/20"
                                >
                                  + Save Question to Step
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SITUATIONAL SCENARIO WORKSPACE */}
                        {currentFlowStep.assessmentType === "situational" && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-400 uppercase">Emergency Scenario Description</label>
                              <textarea
                                rows="3"
                                placeholder="Describe the disaster challenge situation..."
                                value={currentFlowStep.situationalScenario}
                                onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, situationalScenario: e.target.value })}
                                className="w-full p-2.5 bg-[#111827] border border-[#1f2937] text-xs rounded-lg mt-1"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-400 uppercase">Grading Rubric Hint / Guide</label>
                              <textarea
                                rows="2"
                                placeholder="What core criteria or answers should the grading officer check for?..."
                                value={currentFlowStep.situationalGuide}
                                onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, situationalGuide: e.target.value })}
                                className="w-full p-2.5 bg-[#111827] border border-[#1f2937] text-xs rounded-lg mt-1"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={addStepToFlow}
                      className="w-full py-2.5 bg-[#1f2937] hover:bg-[#273142] border border-[#374151] text-xs text-white font-bold rounded-xl transition-all"
                    >
                      + Save and Add Step into Module Sequence List
                    </button>
                  </div>
                </div>

                <button type="submit" className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl transition-all tracking-wider text-sm shadow-lg">
                  {editingModuleId ? "Save All Changes to Module Layout" : "Save and Commit Training Module Layout"}
                </button>
              </form>
            </div>
          )}

          {/* VIEW TAB 3: ADD PERSONNEL FRAMEWORK */}
          {activeTab === "users" && (
            <div className="max-w-xl mx-auto bg-[#111827] p-8 rounded-2xl border border-[#1f2937] shadow-xl animate-in fade-in duration-150">
              <div className="border-b border-[#1f2937] pb-3 mb-6">
                <h2 className="text-lg font-bold text-white">Register District Personnel</h2>
                <p className="text-xs text-gray-400">Add staff accounts and set user permission tiers.</p>
              </div>
              
              <form onSubmit={handleUserSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Personnel Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Juan Dela Cruz"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Official Email Address</label>
                  <input 
                    type="email" 
                    placeholder="name@mdrrmo.gov.ph"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">User Role Type</label>
                  <select 
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full p-3.5 bg-[#0b0f19] border border-[#1f2937] text-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value="Field Responder">Field Responder</option>
                    <option value="MDRRM Officer">MDRRM Communications Officer</option>
                    <option value="System Admin">System Administrator</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl transition-all text-sm shadow-md">
                  Register User Credentials
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}