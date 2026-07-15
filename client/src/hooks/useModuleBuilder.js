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
  const [stagedLevels, setStagedLevels] = useState([
    { levelOrder: 1, levelTitle: "", levelDescription: "", passing_threshold: 80, is_locked_by_default: false }
  ]);
  const [activeLevelOrder, setActiveLevelOrder] = useState(1);
  const [stagedFlows, setStagedFlows] = useState([]);
  
  const [currentFlowStep, setCurrentFlowStep] = useState({
    builderStepType: "learning_material", // "learning_material", "quiz", or "situational"
    type: "text", title: "", textContent: "", videoUrl: "", assessmentType: "quiz", quizQuestions: [], situationalScenario: "", is_final_assessment: false
  });
  
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState({
    questionText: "", 
    options: [
      { text: "", rationale: "" }, 
      { text: "", rationale: "" }, 
      { text: "", rationale: "" }, 
      { text: "", rationale: "" }
    ], 
    correctAnswerIndex: 0
  });

  const [currentSituationalData, setCurrentSituationalData] = useState({
    interactionType: "priority_action",
    // Priority Action (similar to quiz)
    options: [
      { text: "", rationale: "" },
      { text: "", rationale: "" },
      { text: "", rationale: "" },
      { text: "", rationale: "" }
    ],
    correctAnswerIndex: 0,
    // Hazard Identification
    hazards: [
      { text: "", rationale: "", isRequired: true }
    ],
    // Action Sequence
    sequenceSteps: [
      { text: "", order: 1 }
    ]
  });

  const [situationalImage, setSituationalImage] = useState(null);
  const [writtenMaterialFile, setWrittenMaterialFile] = useState(null);

  const addStepToFlow = () => {
    const errors = {};
    if (!currentFlowStep.title.trim()) errors.stepTitle = "A step title is required to identify this module segment.";
    
    if (currentFlowStep.builderStepType === "learning_material") {
      if (!currentFlowStep.textContent.trim() && !writtenMaterialFile) {
        errors.stepContent = "Instructional content or a media file is required for a learning material.";
      }
    }
    
    if (currentFlowStep.builderStepType === "quiz") {
      if (currentFlowStep.quizQuestions.length === 0) {
        errors.stepQuiz = "At least one assessment question must be saved for this verification step.";
      }
    }
    
    if (currentFlowStep.builderStepType === "situational") {
      if (!currentFlowStep.situationalScenario.trim()) {
        errors.stepScenario = "A scenario description is required for this situational assessment.";
      }
      
      if (currentSituationalData.interactionType === "priority_action") {
        if (currentSituationalData.options.some(opt => !opt.text.trim())) errors.situationalOptions = "All four options must be populated.";
        if (currentSituationalData.options.some(opt => !opt.rationale.trim())) errors.situationalOptions = "Rationale is required for all options.";
      } else if (currentSituationalData.interactionType === "hazard_identification") {
        if (currentSituationalData.hazards.length === 0) errors.situationalHazards = "At least one hazard must be defined.";
        if (currentSituationalData.hazards.some(h => !h.text.trim() || !h.rationale.trim())) errors.situationalHazards = "All hazards must have text and rationale.";
      } else if (currentSituationalData.interactionType === "action_sequence") {
        if (currentSituationalData.sequenceSteps.length < 2) errors.situationalSequence = "At least two sequence steps must be defined.";
        if (currentSituationalData.sequenceSteps.some(s => !s.text.trim())) errors.situationalSequence = "All sequence steps must have text.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("System Error: Validation failed. Please ensure all required fields are populated.");
      return false;
    }

    const stepWithMeta = { ...currentFlowStep, id: crypto.randomUUID(), levelOrder: activeLevelOrder };
    
    // Assign proper backend type
    if (currentFlowStep.builderStepType === "quiz") {
      stepWithMeta.type = "quiz";
    } else if (currentFlowStep.builderStepType === "situational") {
      stepWithMeta.type = currentSituationalData.interactionType;
      stepWithMeta.assessmentType = "situational";
      stepWithMeta.situationalData = currentSituationalData;
    } else if (writtenMaterialFile && writtenMaterialFile.type.startsWith("video/")) {
      stepWithMeta.type = "video";
    } else {
      stepWithMeta.type = "text";
    }

    if ((stepWithMeta.type === "text" || stepWithMeta.type === "video") && writtenMaterialFile) {
      stepWithMeta.attachedFile = writtenMaterialFile;
      stepWithMeta.attachedFileName = writtenMaterialFile.name;
    }
    if (currentFlowStep.assessmentType === "situational" && situationalImage) {
      stepWithMeta.attachedFile = situationalImage;
      stepWithMeta.attachedImageName = situationalImage.name;
    }
    
    setStagedFlows([...stagedFlows, stepWithMeta]);
    setWrittenMaterialFile(null);
    setSituationalImage(null);
    setCurrentFlowStep({ type: "text", title: "", textContent: "", videoUrl: "", assessmentType: "quiz", quizQuestions: [], situationalScenario: "", is_final_assessment: false });
    setCurrentSituationalData({
      interactionType: "priority_action",
      options: [{ text: "", rationale: "" }, { text: "", rationale: "" }, { text: "", rationale: "" }, { text: "", rationale: "" }],
      correctAnswerIndex: 0,
      hazards: [{ text: "", rationale: "", isRequired: true }],
      sequenceSteps: [{ text: "", order: 1 }]
    });
    setFormErrors({});
    return true;
  };

  const addQuizQuestionToStep = () => {
    const errors = {};
    if (!currentQuizQuestion.questionText.trim()) errors.questionText = "Question text is required to proceed.";
    if (currentQuizQuestion.options.some(opt => !opt.text.trim())) errors.options = "All four multiple-choice options must be populated.";
    if (currentQuizQuestion.options.some(opt => !opt.rationale.trim())) errors.options = "Rationale / Formative Feedback is required for all options to ensure pedagogical effectiveness.";
    
    if (Object.keys(errors).length > 0) {
      setFormErrors({ ...formErrors, ...errors });
      return;
    }

    setCurrentFlowStep({
      ...currentFlowStep,
      quizQuestions: [...currentFlowStep.quizQuestions, currentQuizQuestion]
    });
    setCurrentQuizQuestion({ 
      questionText: "", 
      options: [
        { text: "", rationale: "" }, 
        { text: "", rationale: "" }, 
        { text: "", rationale: "" }, 
        { text: "", rationale: "" }
      ], 
      correctAnswerIndex: 0 
    });
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
    
    const hasEmptyLevelTitles = stagedLevels.some(lvl => !lvl.levelTitle.trim());
    if (hasEmptyLevelTitles) {
      toast.error("System Error: One or more curriculum levels are missing a valid title. Please verify inputs before publishing.");
      return;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("System Error: Module validation failed. Please review the highlighted fields before publishing.");
      return;
    }

    const loadingToastId = toast.loading("Executing module publication process...");

    try {
      // 1. PRE-UPLOAD ALL MEDIA FIRST
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

      // 2. CREATE NESTED PAYLOAD
      const levelsPayload = stagedLevels.map(lvl => {
         // Filter steps that belong to this level
         const levelFlows = uploadedFlows.filter(f => f.levelOrder === lvl.levelOrder);
         
         const stepsPayload = levelFlows.map((flow, index) => {
             let questionsToSave = [];
             
             if (flow.type === "quiz") {
                 questionsToSave = flow.quizQuestions?.map(q => ({
                     questionText: q.questionText,
                     imageURL: '',
                     options: q.options.map((opt, optIdx) => ({
                         text: opt.text,
                         isCorrect: optIdx === q.correctAnswerIndex,
                         rationale: opt.rationale
                     }))
                 })) || [];
             } else if (flow.assessmentType === "situational" && flow.situationalData) {
                 const interaction = flow.situationalData.interactionType;
                 
                 let options = [];
                 if (interaction === "priority_action") {
                     options = flow.situationalData.options.map((opt, optIdx) => ({
                         text: opt.text,
                         isCorrect: optIdx === flow.situationalData.correctAnswerIndex,
                         rationale: opt.rationale
                     }));
                 } else if (interaction === "hazard_identification") {
                     options = flow.situationalData.hazards.map((hazard) => ({
                         text: hazard.text,
                         isCorrect: hazard.isRequired,
                         rationale: hazard.rationale
                     }));
                 } else if (interaction === "action_sequence") {
                     options = flow.situationalData.sequenceSteps.map((step) => ({
                         text: step.text,
                         isCorrect: true, // all steps are "correct" parts of the sequence
                         sequence_order: step.order
                     }));
                 }
                 
                 questionsToSave = [{
                     questionText: flow.situationalScenario,
                     imageURL: '',
                     options: options
                 }];
             }
             
             return {
                 stepOrder: index + 1,
                 stepTitle: flow.title,
                 stepContent: flow.type === "text" ? flow.textContent : flow.situationalScenario,
                 mediaUrl: flow.finalMediaUrl,
                 stepType: flow.type,
                 is_final_assessment: flow.is_final_assessment || false,
                 quizQuestions: questionsToSave
             };
         });

         return {
            levelOrder: lvl.levelOrder,
            levelTitle: lvl.levelTitle,
            levelDescription: lvl.levelDescription,
            passing_threshold: Number(lvl.passing_threshold) || 80,
            is_locked_by_default: lvl.is_locked_by_default ?? true,
            steps: stepsPayload
         };
      });

      const modulePayload = {
        moduleName: moduleForm.title,
        moduleCategory: moduleForm.category,
        description: moduleForm.description,
        level: moduleForm.level,
        duration: moduleForm.duration,
        image_url: moduleForm.image_url,
        video_url: "",
        levels: levelsPayload
      };

      const moduleResponse = await apiClient.post("modules", modulePayload);

      toast.success("Syllabus configuration successfully published to the production database.", { id: loadingToastId });
      setEditingModuleId(null);
      setModuleForm({ title: "", description: "", level: "Level 1", category: "General Safety / Protocols", duration: "15 mins", image_url: "" });
      setStagedFlows([]);
      setStagedLevels([{ levelOrder: 1, levelTitle: "Phase 1: Basic Awareness", levelDescription: "Fundamental concepts container.", passing_threshold: 80, is_locked_by_default: true }]);
      setActiveLevelOrder(1);
      setFormErrors({});
    } catch (error) {
      console.error("Critical error executing data synchronization processing:", error);
      toast.error(`Publication aborted: ${error.response?.data?.message || error.message}`, { id: loadingToastId });
    }
  };

  const triggerFlowSequencePreview = () => {
    if (stagedFlows.length === 0) {
      toast.error("System Error: No curriculum sequences detected. Please stage at least one sequence step to initiate the preview.");
      return false;
    }
    return true;
  };

  return {
    state: {
      editingModuleId,
      moduleForm,
      stagedLevels,
      activeLevelOrder,
      stagedFlows,
      currentFlowStep,
      currentQuizQuestion,
      currentSituationalData,
      situationalImage,
      writtenMaterialFile,
      formErrors
    },
    setters: {
      setEditingModuleId,
      setModuleForm,
      setStagedLevels,
      setActiveLevelOrder,
      setStagedFlows,
      setCurrentFlowStep,
      setCurrentQuizQuestion,
      setCurrentSituationalData,
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
