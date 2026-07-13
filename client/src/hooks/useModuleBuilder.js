import { useState } from "react";
import apiClient from "../lib/apiClient";

export function useModuleBuilder() {
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [moduleForm, setModuleForm] = useState({ 
    title: "", 
    description: "", 
    level: "Level 1",
    category: "General Safety / Protocols",
    duration: "15 mins",
    image_url: ""
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
        moduleCategory: moduleForm.category,
        description: moduleForm.description,
        level: moduleForm.level,
        duration: moduleForm.duration,
        image_url: moduleForm.image_url,
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

        await apiClient.post(`modules/steps/${targetLevelId}`, stepPayload);
      }

      alert("Syllabus configuration structure successfully published to production database!");
      setEditingModuleId(null);
      setModuleForm({ title: "", description: "", level: "Level 1", category: "General Safety / Protocols", duration: "15 mins", image_url: "" });
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

  return {
    state: {
      editingModuleId,
      moduleForm,
      stagedFlows,
      currentFlowStep,
      currentQuizQuestion,
      situationalImage,
      writtenMaterialFile
    },
    setters: {
      setEditingModuleId,
      setModuleForm,
      setStagedFlows,
      setCurrentFlowStep,
      setCurrentQuizQuestion,
      setSituationalImage,
      setWrittenMaterialFile
    },
    actions: {
      addStepToFlow,
      addQuizQuestionToStep,
      handleModuleSubmit,
      triggerFlowSequencePreview
    }
  };
}
