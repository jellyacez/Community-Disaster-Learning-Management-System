import { useState } from "react";
import toast from "react-hot-toast";
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

  const [formErrors, setFormErrors] = useState({});
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
    const errors = {};
    if (!currentFlowStep.title.trim()) errors.stepTitle = "A step title is required to identify this module segment.";
    
    if (!currentFlowStep.textContent.trim()) {
      errors.stepContent = "Instructional content is required. Please provide the necessary documentation.";
    }
    
    if (currentFlowStep.assessmentType === "quiz" && currentFlowStep.quizQuestions.length === 0) {
      errors.stepQuiz = "At least one assessment question must be saved for this verification step.";
    }
    if (currentFlowStep.assessmentType === "situational" && !currentFlowStep.situationalScenario.trim()) {
      errors.stepScenario = "A scenario description is required for this situational assessment.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Validation failed. Please ensure all required fields in this step are completed.");
      return;
    }

    const stepWithMeta = { ...currentFlowStep, id: crypto.randomUUID() };
    if (currentFlowStep.type === "text" && writtenMaterialFile) {
      stepWithMeta.attachedFile = writtenMaterialFile;
      stepWithMeta.attachedFileName = writtenMaterialFile.name;
    }
    if (currentFlowStep.type === "assessment" && currentFlowStep.assessmentType === "situational" && situationalImage) {
      stepWithMeta.attachedFile = situationalImage;
      stepWithMeta.attachedImageName = situationalImage.name;
    }
    
    setStagedFlows([...stagedFlows, stepWithMeta]);
    setWrittenMaterialFile(null);
    setSituationalImage(null);
    setCurrentFlowStep({ type: "text", title: "", textContent: "", videoUrl: "", assessmentType: "quiz", quizQuestions: [], situationalScenario: "", situationalGuide: "" });
    setFormErrors({});
    toast.success("Step successfully appended to the sequence module.");
  };

  const addQuizQuestionToStep = () => {
    const errors = {};
    if (!currentQuizQuestion.questionText.trim()) errors.questionText = "Question text is required to proceed.";
    if (currentQuizQuestion.options.some(opt => !opt.trim())) errors.options = "All four multiple-choice options must be populated.";
    
    if (Object.keys(errors).length > 0) {
      setFormErrors({ ...formErrors, ...errors });
      return;
    }

    setCurrentFlowStep({
      ...currentFlowStep,
      quizQuestions: [...currentFlowStep.quizQuestions, currentQuizQuestion]
    });
    setCurrentQuizQuestion({ questionText: "", options: ["", "", "", ""], correctAnswerIndex: 0 });
    const newErrors = { ...formErrors };
    delete newErrors.questionText;
    delete newErrors.options;
    setFormErrors(newErrors);
    toast.success("Assessment question successfully saved.");
  };

  const handleModuleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = {};
    if (!moduleForm.title.trim()) errors.title = "A module topic title is required.";
    if (!moduleForm.description.trim() || moduleForm.description === "<p></p>") errors.description = "A short description or summary is required for the module overview.";
    if (stagedFlows.length === 0) errors.flows = "A module must contain at least one instructional or assessment step before publishing.";
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Module validation failed. Please review the highlighted errors before publishing.");
      return;
    }

    const loadingToastId = toast.loading("Executing module publication process...");

    try {
      // 1. PRE-UPLOAD ALL MEDIA FIRST
      // This prevents creating orphaned Module/Level DB records if a 50MB video upload fails.
      const uploadedFlows = [];
      for (let i = 0; i < stagedFlows.length; i++) {
        const activeFlow = stagedFlows[i];
        let finalMediaUrl = "";

        if (activeFlow.attachedFile) {
          toast.loading(`Uploading media for Step ${i + 1}...`, { id: loadingToastId });
          const formData = new FormData();
          formData.append("mediaFile", activeFlow.attachedFile);
          try {
             const uploadRes = await apiClient.post("modules/upload-media", formData, {
               headers: { 'Content-Type': 'multipart/form-data' }
             });
             finalMediaUrl = uploadRes.data.url;
          } catch(err) {
             throw new Error(`Upload failed for Step ${i+1}: ${err.response?.data?.message || err.message}`);
          }
        }
        uploadedFlows.push({ ...activeFlow, finalMediaUrl });
      }

      toast.loading("Synchronizing module data to database...", { id: loadingToastId });

      // 2. CREATE DB RECORDS ONLY AFTER UPLOADS SUCCEED
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

      // 3. INSERT STEPS INTO DB
      for (let i = 0; i < uploadedFlows.length; i++) {
        const flow = uploadedFlows[i];
        const stepPayload = {
          stepOrder: i + 1,
          stepTitle: flow.title,
          stepContent: flow.type === "text" ? flow.textContent : flow.situationalScenario,
          mediaUrl: flow.finalMediaUrl,
          stepType: flow.type
        };

        await apiClient.post(`modules/steps/${targetLevelId}`, stepPayload);
      }

      toast.success("Syllabus configuration successfully published to the production database.", { id: loadingToastId });
      setEditingModuleId(null);
      setModuleForm({ title: "", description: "", level: "Level 1", category: "General Safety / Protocols", duration: "15 mins", image_url: "" });
      setStagedFlows([]);
      setFormErrors({});
    } catch (error) {
      console.error("Critical error executing data synchronization processing:", error);
      toast.error(`Publication aborted: ${error.response?.data?.message || error.message}`, { id: loadingToastId });
    }
  };

  const triggerFlowSequencePreview = () => {
    // This is handled by the modal toggle now, but if used standalone:
    if (stagedFlows.length === 0) {
      toast.error("No structural steps found. Please stage at least one sequence step to initiate preview.");
      return false;
    }
    return true;
  };

  return {
    state: {
      editingModuleId,
      moduleForm,
      stagedFlows,
      currentFlowStep,
      currentQuizQuestion,
      situationalImage,
      writtenMaterialFile,
      formErrors
    },
    setters: {
      setEditingModuleId,
      setModuleForm,
      setStagedFlows,
      setCurrentFlowStep,
      setCurrentQuizQuestion,
      setSituationalImage,
      setWrittenMaterialFile,
      setFormErrors
    },
    actions: {
      addStepToFlow,
      addQuizQuestionToStep,
      handleModuleSubmit,
      triggerFlowSequencePreview
    }
  };
}
