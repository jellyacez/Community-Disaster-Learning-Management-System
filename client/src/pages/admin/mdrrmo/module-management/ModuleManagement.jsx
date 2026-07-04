import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ModuleHeaderForm from "./ModuleHeaderForm";
import SequenceCanvas from "./SequenceCanvas";
import StepBuilder from "./StepBuilder";
import apiClient  from "../../../../lib/apiClient";

const fetchModules = async () => {
  
  const res = await apiClient.get("/modules/available"); 
  return res.data;
};

export default function ModuleManagement() {
  const { data: modules = [], isLoading, isError } = useQuery({
    queryKey: ["adminModules"],
    queryFn: fetchModules,
    retry: 1
  });

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

  const [situationalImage, setSituationalImage] = useState(null);
  const [writtenMaterialFile, setWrittenMaterialFile] = useState(null);

  const addStepToFlow = () => {
    if (!currentFlowStep.title.trim()) return alert("Please enter a step name.");
    if (currentFlowStep.type === "text" && !currentFlowStep.textContent.trim()) return alert("Please fill in the documentation text block.");
    if (currentFlowStep.type === "assessment") {
      if (currentFlowStep.assessmentType === "quiz" && currentFlowStep.quizQuestions.length === 0) return alert("Please add at least one question.");
      if (currentFlowStep.assessmentType === "situational" && !currentFlowStep.situationalScenario.trim()) return alert("Please describe the scenario.");
    }
    const stepWithMeta = { ...currentFlowStep, id: crypto.randomUUID() };
    if (currentFlowStep.type === "text" && writtenMaterialFile) stepWithMeta.attachedFileName = writtenMaterialFile.name;
    if (currentFlowStep.type === "assessment" && currentFlowStep.assessmentType === "situational" && situationalImage) stepWithMeta.attachedImageName = situationalImage.name;
    
    setStagedFlows([...stagedFlows, stepWithMeta]);
    setWrittenMaterialFile(null);
    setSituationalImage(null);
    setCurrentFlowStep({ type: "text", title: "", textContent: "", videoUrl: "", assessmentType: "quiz", quizQuestions: [], situationalScenario: "", situationalGuide: "" });
  };

  const addQuizQuestionToStep = () => {
    if (!currentQuizQuestion.questionText.trim()) return alert("Please write a question.");
    if (currentQuizQuestion.options.some(opt => !opt.trim())) return alert("Please fill out all choice options.");
    setCurrentFlowStep({
      ...currentFlowStep,
      quizQuestions: [...currentFlowStep.quizQuestions, currentQuizQuestion]
    });
    setCurrentQuizQuestion({ questionText: "", options: ["", "", "", ""], correctAnswerIndex: 0 });
  };

  const handleModuleSubmit = async (e) => {
    e.preventDefault();
    if (!moduleForm.title || !moduleForm.description) return alert("Please enter title and description.");
    if (stagedFlows.length === 0) return alert("Please add at least one step.");
    
    try {
      
      const moduleResponse = await apiClient.post("modules", {
        moduleName: moduleForm.title,
        moduleCategory: moduleForm.status,
        description: moduleForm.description,
        level: moduleForm.riskLevel,
        duration: "Varies",
        image_url: "",
        video_url: ""
      });

      
      const moduleResult = moduleResponse.data;
      const targetModuleId = moduleResult.data.mod_id;

     
      const levelResponse = await apiClient.post(`modules/${targetModuleId}`, {
        levelOrder: 1,
        levelTitle: `Core Curriculum for ${moduleForm.title}`,
        levelDescription: "Auto-generated structural configuration container."
      });

      const levelResult = levelResponse.data;
      const targetLevelId = levelResult.data.level_id;

      // STEPS
      for (let i = 0; i < stagedFlows.length; i++) {
        const activeFlow = stagedFlows[i];

        const stepPayload = {
          stepOrder: i + 1,
          stepTitle: activeFlow.title,
          stepContent: activeFlow.type === "text" ? activeFlow.textContent : activeFlow.situationalScenario,
          mediaUrl: activeFlow.type === "text" ? (activeFlow.attachedFileName || "") : (activeFlow.attachedImageName || ""),
          stepType: activeFlow.type
        };

       
        const stepResponse = await apiClient.post(`modules/steps/${targetLevelId}`, stepPayload);

        // Optional individual inner logic checks can be safely evaluated using standard Axios errors or status checks
      }

      alert("Syllabus configuration structure successfully published to production database!");
      setEditingModuleId(null);
      setModuleForm({ title: "", description: "", riskLevel: "Low", status: "Public" });
      setStagedFlows([]);
    } catch (error) {
      console.error("Critical error executing data synchronization processing:", error);
     
      alert(`Publishing aborted: ${error.response?.data?.message || error.message}`);
    }
  };

  const triggerFlowSequencePreview = () => {
    const seq = stagedFlows.map((item, idx) => `${idx + 1}. [${item.type.toUpperCase()}] ${item.title}`).join("\n");
    alert(`Current Staged Curriculum Layout:\n\n${seq}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-3 text-gray-500 font-medium">Loading Module Builder...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
        <p className="font-bold">Error loading module builder.</p>
        <p className="text-sm">Please ensure the backend routes are connected.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-150 pb-12">
      <form onSubmit={handleModuleSubmit} className="space-y-6">
        
        <ModuleHeaderForm 
          editingModuleId={editingModuleId}
          moduleForm={moduleForm}
          setModuleForm={setModuleForm}
        />

        <SequenceCanvas 
          stagedFlows={stagedFlows}
          setStagedFlows={setStagedFlows}
          triggerFlowSequencePreview={triggerFlowSequencePreview}
        />

        <StepBuilder 
          currentFlowStep={currentFlowStep}
          setCurrentFlowStep={setCurrentFlowStep}
          writtenMaterialFile={writtenMaterialFile}
          setWrittenMaterialFile={setWrittenMaterialFile}
          currentQuizQuestion={currentQuizQuestion}
          setCurrentQuizQuestion={setCurrentQuizQuestion}
          addQuizQuestionToStep={addQuizQuestionToStep}
          situationalImage={situationalImage}
          setSituationalImage={setSituationalImage}
          addStepToFlow={addStepToFlow}
        />

        <button 
          type="submit" 
          className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm uppercase tracking-wider shadow-md transition-colors"
        >
          {editingModuleId ? "Commit Changes to Syllabus" : "Publish Training Module Layout"}
        </button>
      </form>
    </div>
  );
}