import { useState } from "react";
import toast from "react-hot-toast";

export function useStepStager(activeLevelOrder, setFormErrors) {
  const [stagedFlows, setStagedFlows] = useState([]);
  const [currentFlowStep, setCurrentFlowStep] = useState({
    builderStepType: "learning_material", // "learning_material", "quiz", or "situational"
    type: "text", title: "", textContent: "", videoUrl: "", assessmentType: "quiz", quizQuestions: [], situationalScenarios: [], is_final_assessment: false
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
    scenarioDescription: "",
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
  const [editingStepId, setEditingStepId] = useState(null);

  const handleEditStep = (stepId) => {
    const stepToEdit = stagedFlows.find(s => s.id === stepId);
    if (!stepToEdit) return;
    
    // We scroll back to top of builder
    setCurrentFlowStep(stepToEdit);
    setEditingStepId(stepId);
    if (stepToEdit.assessmentType === "situational") {
      // For editing, we don't need to push it into currentSituationalData yet,
      // because situationalScenarios is already in stepToEdit and mapped down.
    }
  };

  const addStepToFlow = () => {
    const errors = {};
    if (!currentFlowStep.title.trim()) errors.stepTitle = "A step title is required to identify this module segment.";
    
    if (currentFlowStep.builderStepType === "learning_material") {
      if (!currentFlowStep.textContent.trim() && !writtenMaterialFile && !currentFlowStep.attachedFileName) {
        errors.stepContent = "Instructional content or a media file is required for a learning material.";
      }
    }
    
    if (currentFlowStep.builderStepType === "quiz") {
      if (currentFlowStep.quizQuestions.length === 0) {
        errors.stepQuiz = "At least one assessment question must be saved for this verification step.";
      }
    }
    
    if (currentFlowStep.builderStepType === "situational") {
      if (currentFlowStep.situationalScenarios.length === 0) {
        errors.stepScenario = "At least one situational scenario must be added to this assessment step.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("System Error: Validation failed. Please ensure all required fields are populated.");
      return false;
    }

    const stepWithMeta = { ...currentFlowStep, levelOrder: activeLevelOrder };
    
    // Assign proper backend type
    if (currentFlowStep.builderStepType === "quiz") {
      stepWithMeta.type = "quiz";
    } else if (currentFlowStep.builderStepType === "situational") {
      stepWithMeta.type = "situational"; // General step type
      stepWithMeta.assessmentType = "situational";
      // situationalScenarios is already correctly mapped via currentFlowStep.situationalScenarios
    } else if (writtenMaterialFile && writtenMaterialFile.type.startsWith("video/")) {
      stepWithMeta.type = "video";
    } else if (!stepWithMeta.type || stepWithMeta.type === "") {
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
    
    if (editingStepId) {
      stepWithMeta.id = editingStepId;
      const index = stagedFlows.findIndex(s => s.id === editingStepId);
      if (index !== -1) {
        const newFlows = [...stagedFlows];
        newFlows[index] = stepWithMeta;
        setStagedFlows(newFlows);
      }
      setEditingStepId(null);
    } else {
      stepWithMeta.id = crypto.randomUUID();
      setStagedFlows([...stagedFlows, stepWithMeta]);
    }

    setWrittenMaterialFile(null);
    setSituationalImage(null);
    setCurrentFlowStep({ builderStepType: "learning_material", type: "text", title: "", textContent: "", videoUrl: "", assessmentType: "quiz", quizQuestions: [], situationalScenarios: [], is_final_assessment: false });
    setCurrentSituationalData({
      scenarioDescription: "",
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
      correctAnswerIndex: 0,
      options: [
        { text: "", rationale: "" }, 
        { text: "", rationale: "" }, 
        { text: "", rationale: "" }, 
        { text: "", rationale: "" }
      ] 
    });
    const newErrors = { ...formErrors };
    delete newErrors.questionText;
    delete newErrors.options;
    setFormErrors({});
    toast.success("Quiz question added to step!");
  };

  const addSituationalScenarioToStep = (formErrors) => {
    const errors = {};
    if (!currentSituationalData.scenarioDescription.trim()) {
      errors.scenarioDescription = "A scenario description is required to proceed.";
    }
    
    if (currentSituationalData.interactionType === "priority_action") {
      if (currentSituationalData.options.some(opt => !opt.text.trim())) errors.options = "All four options must be populated.";
      if (currentSituationalData.options.some(opt => !opt.rationale.trim())) errors.options = "Rationale is required for all options.";
    } else if (currentSituationalData.interactionType === "hazard_identification") {
      if (currentSituationalData.hazards.length === 0) errors.hazards = "At least one hazard must be defined.";
      if (currentSituationalData.hazards.some(h => !h.text.trim() || !h.rationale.trim())) errors.hazards = "All hazards must have text and rationale.";
    } else if (currentSituationalData.interactionType === "action_sequence") {
      if (currentSituationalData.sequenceSteps.length < 2) errors.sequence = "At least two sequence steps must be defined.";
      if (currentSituationalData.sequenceSteps.some(s => !s.text.trim())) errors.sequence = "All sequence steps must have text.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fill all required scenario fields before adding.");
      return;
    }

    const newScenario = {
      id: crypto.randomUUID(),
      ...currentSituationalData
    };

    setCurrentFlowStep({
      ...currentFlowStep,
      situationalScenarios: [...currentFlowStep.situationalScenarios, newScenario]
    });

    // Reset situational editor form
    setCurrentSituationalData({
      scenarioDescription: "",
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
    setFormErrors({});
    toast.success("Situational scenario added to step!");
  };

  return {
    stagedFlows, setStagedFlows,
    currentFlowStep, setCurrentFlowStep,
    currentQuizQuestion, setCurrentQuizQuestion,
    currentSituationalData, setCurrentSituationalData,
    situationalImage, setSituationalImage,
    writtenMaterialFile, setWrittenMaterialFile,
    addStepToFlow, addQuizQuestionToStep, addSituationalScenarioToStep, handleEditStep
  };
}
