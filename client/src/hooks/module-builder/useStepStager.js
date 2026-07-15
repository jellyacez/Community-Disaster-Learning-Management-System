import { useState } from "react";
import toast from "react-hot-toast";

export function useStepStager(activeLevelOrder, setFormErrors) {
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
    options: [
      { text: "", rationale: "" },
      { text: "", rationale: "" },
      { text: "", rationale: "" },
      { text: "", rationale: "" }
    ],
    correctAnswerIndex: 0,
    hazards: [
      { text: "", rationale: "", isRequired: true }
    ],
    sequenceSteps: [
      { text: "", order: 1 }
    ]
  });

  const [situationalImage, setSituationalImage] = useState(null);
  const [writtenMaterialFile, setWrittenMaterialFile] = useState(null);

  const addStepToFlow = (formErrors) => {
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

  const addQuizQuestionToStep = (formErrors) => {
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

  return {
    stagedFlows, setStagedFlows,
    currentFlowStep, setCurrentFlowStep,
    currentQuizQuestion, setCurrentQuizQuestion,
    currentSituationalData, setCurrentSituationalData,
    situationalImage, setSituationalImage,
    writtenMaterialFile, setWrittenMaterialFile,
    addStepToFlow, addQuizQuestionToStep
  };
}
