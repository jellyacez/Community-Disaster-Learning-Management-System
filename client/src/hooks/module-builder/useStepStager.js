import { useState } from "react";
import toast from "react-hot-toast";

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
};

export function useStepStager(activeLevelOrder, setFormErrors) {
  const [stagedFlows, setStagedFlows] = useState([]);
  const [currentFlowStep, setCurrentFlowStep] = useState({
    builderStepType: "learning_material",
    type: "text",
    title: "",
    textContent: "",
    videoUrl: "",
    assessmentType: "quiz",
    plannedQuestionCount: 1,
    quizQuestions: [],
    situationalScenarios: [],
    is_final_assessment: false,
  });

  const [currentQuizQuestion, setCurrentQuizQuestion] = useState({
    questionType: "multiple_choice",
    questionText: "",
    options: [
      { text: "", rationale: "" },
      { text: "", rationale: "" },
      { text: "", rationale: "" },
      { text: "", rationale: "" },
    ],
    correctAnswerIndex: 0,
  });

  const [currentSituationalData, setCurrentSituationalData] = useState({
    scenarioDescription: "",
    interactionType: "priority_action",
    options: [
      { text: "", rationale: "" },
      { text: "", rationale: "" },
      { text: "", rationale: "" },
      { text: "", rationale: "" },
    ],
    correctAnswerIndex: 0,
    hazards: [{ text: "", rationale: "", isRequired: true }],
    sequenceSteps: [{ text: "", order: 1 }],
  });

  const [situationalImage, setSituationalImage] = useState(null);
  const [writtenMaterialFile, setWrittenMaterialFile] = useState(null);
  const [editingStepId, setEditingStepId] = useState(null);

  const handleEditStep = (stepId) => {
    const stepToEdit = stagedFlows.find((s) => s.id === stepId);
    if (!stepToEdit) return;

    setCurrentFlowStep({
      ...stepToEdit,
      plannedQuestionCount: stepToEdit.plannedQuestionCount || 1,
    });

    setEditingStepId(stepId);
  };

  const addStepToFlow = () => {
    const errors = {};
    if (!currentFlowStep.title.trim()) {
      errors.stepTitle =
        "A step title is required to identify this module segment.";
    }

    if (currentFlowStep.builderStepType === "learning_material") {
      if (
        !currentFlowStep.textContent.trim() &&
        !writtenMaterialFile &&
        !currentFlowStep.attachedFileName
      ) {
        errors.stepContent =
          "Instructional content or a media file is required for a learning material.";
      }
    }

    if (currentFlowStep.builderStepType === "quiz") {
      if (currentFlowStep.quizQuestions.length === 0) {
        errors.stepQuiz =
          "At least one assessment question must be saved for this verification step.";
      }
    }

    if (currentFlowStep.builderStepType === "situational") {
      if (currentFlowStep.situationalScenarios.length === 0) {
        errors.stepScenario =
          "At least one situational scenario must be added to this assessment step.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors({ ...errors, _scrollTrigger: Date.now() });
      toast.error(
        "System Error: Validation failed. Please ensure all required fields are populated."
      );
      return false;
    }

    const stepWithMeta = {
      ...currentFlowStep,
      levelOrder: activeLevelOrder,
      plannedQuestionCount: currentFlowStep.plannedQuestionCount || 1,
    };

    if (currentFlowStep.builderStepType === "quiz") {
      stepWithMeta.type = "quiz";
    } else if (currentFlowStep.builderStepType === "situational") {
      stepWithMeta.type = "situational";
      stepWithMeta.assessmentType = "situational";
    } else if (
      writtenMaterialFile &&
      writtenMaterialFile.type.startsWith("video/")
    ) {
      stepWithMeta.type = "video";
    } else if (
      writtenMaterialFile &&
      writtenMaterialFile.type === "application/pdf"
    ) {
      stepWithMeta.type = "pdf";
    } else if (!stepWithMeta.type || stepWithMeta.type === "") {
      stepWithMeta.type = "text";
    }

    if (
      (stepWithMeta.type === "text" ||
        stepWithMeta.type === "video" ||
        stepWithMeta.type === "pdf") &&
      writtenMaterialFile
    ) {
      stepWithMeta.attachedFile = writtenMaterialFile;
      stepWithMeta.attachedFileName = writtenMaterialFile.name;
    }

    if (currentFlowStep.assessmentType === "situational" && situationalImage) {
      stepWithMeta.attachedFile = situationalImage;
      stepWithMeta.attachedImageName = situationalImage.name;
    }

    const isEditing = !!editingStepId;

    if (editingStepId) {
      stepWithMeta.id = editingStepId;
      setStagedFlows((prev) => {
        const index = prev.findIndex((s) => s.id === editingStepId);
        if (index !== -1) {
          const newFlows = [...prev];
          newFlows[index] = stepWithMeta;
          return newFlows;
        }
        return prev;
      });
      setEditingStepId(null);
    } else {
      stepWithMeta.id = generateId();
      setStagedFlows((prev) => [...prev, stepWithMeta]);
    }

    if (stepWithMeta.builderStepType === "quiz") {
      toast.success(
        isEditing
          ? "Quiz assessment updated successfully"
          : "Quiz assessment added successfully"
      );
    } else if (stepWithMeta.builderStepType === "situational") {
      toast.success(
        isEditing
          ? "Situational assessment updated successfully"
          : "Situational assessment added successfully"
      );
    } else if (stepWithMeta.type === "video") {
      toast.success(
        isEditing
          ? "Video resource updated successfully"
          : "Video resource added successfully"
      );
    } else if (stepWithMeta.type === "pdf") {
      toast.success(
        isEditing
          ? "PDF resource updated successfully"
          : "PDF resource added successfully"
      );
    } else {
      toast.success(
        isEditing
          ? "Text content updated successfully"
          : "Text content added successfully"
      );
    }

    setWrittenMaterialFile(null);
    setSituationalImage(null);
    setCurrentFlowStep({
      builderStepType: "learning_material",
      type: "text",
      title: "",
      textContent: "",
      videoUrl: "",
      assessmentType: "quiz",
      plannedQuestionCount: 1,
      quizQuestions: [],
      situationalScenarios: [],
      is_final_assessment: false,
    });
    setCurrentSituationalData({
      scenarioDescription: "",
      interactionType: "priority_action",
      options: [
        { text: "", rationale: "" },
        { text: "", rationale: "" },
        { text: "", rationale: "" },
        { text: "", rationale: "" },
      ],
      correctAnswerIndex: 0,
      hazards: [{ text: "", rationale: "", isRequired: true }],
      sequenceSteps: [{ text: "", order: 1 }],
    });
    setCurrentQuizQuestion({
      questionType: "multiple_choice",
      questionText: "",
      correctAnswerIndex: 0,
      options: [
        { text: "", rationale: "" },
        { text: "", rationale: "" },
        { text: "", rationale: "" },
        { text: "", rationale: "" },
      ],
    });
    setFormErrors({});
    return true;
  };

  const addQuizQuestionToStep = (formErrors) => {
    const errors = {};
    if (!currentQuizQuestion.questionText.trim()) {
      errors.questionText = "Question text is required to proceed.";
    }

    if (
      currentQuizQuestion.questionType === "multiple_choice" &&
      currentQuizQuestion.options.some((opt) => !opt.text.trim())
    ) {
      errors.options = "All four multiple-choice options must be populated.";
    }

    if (
      currentQuizQuestion.questionType === "multiple_choice" &&
      currentQuizQuestion.options.some((opt) => !opt.rationale.trim())
    ) {
      errors.options =
        "Rationale / Formative Feedback is required for all options to ensure pedagogical effectiveness.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors({ ...formErrors, ...errors, _scrollTrigger: Date.now() });
      return;
    }

    setCurrentFlowStep({
      ...currentFlowStep,
      quizQuestions: [...currentFlowStep.quizQuestions, currentQuizQuestion],
    });

    setCurrentQuizQuestion({
      questionType: "multiple_choice",
      questionText: "",
      correctAnswerIndex: 0,
      options: [
        { text: "", rationale: "" },
        { text: "", rationale: "" },
        { text: "", rationale: "" },
        { text: "", rationale: "" },
      ],
    });

    setFormErrors({});
    toast.success("Quiz question added to step!");
  };

  const addSituationalScenarioToStep = () => {
    try {
      const errors = {};
      if (!currentSituationalData.scenarioDescription?.trim()) {
        errors.scenarioDescription =
          "A scenario description is required to proceed.";
      }

      if (currentSituationalData.interactionType === "priority_action") {
        if (currentSituationalData.options?.some((opt) => !opt.text?.trim()))
          errors.situationalOptions = "All four options must be populated.";
        if (
          currentSituationalData.options?.some((opt) => !opt.rationale?.trim())
        )
          errors.situationalOptions = "Rationale is required for all options.";
      } else if (
        currentSituationalData.interactionType === "hazard_identification"
      ) {
        if (
          !currentSituationalData.hazards ||
          currentSituationalData.hazards.length === 0
        )
          errors.situationalHazards = "At least one hazard must be defined.";
        if (
          currentSituationalData.hazards?.some(
            (h) => !h.text?.trim() || !h.rationale?.trim()
          )
        )
          errors.situationalHazards =
            "All hazards must have text and rationale.";
      } else if (
        currentSituationalData.interactionType === "action_sequence"
      ) {
        if (
          !currentSituationalData.sequenceSteps ||
          currentSituationalData.sequenceSteps.length < 2
        )
          errors.situationalSequence =
            "At least two sequence steps must be defined.";
        if (
          currentSituationalData.sequenceSteps?.some((s) => !s.text?.trim())
        )
          errors.situationalSequence = "All sequence steps must have text.";
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors({ ...errors, _scrollTrigger: Date.now() });
        toast.error("Please fill all required scenario fields before adding.");
        return;
      }

      const newScenario = {
        id: generateId(),
        ...currentSituationalData,
      };

      setCurrentFlowStep({
        ...currentFlowStep,
        situationalScenarios: [
          ...(currentFlowStep.situationalScenarios || []),
          newScenario,
        ],
      });

      setCurrentSituationalData({
        scenarioDescription: "",
        interactionType: "priority_action",
        options: [
          { text: "", rationale: "" },
          { text: "", rationale: "" },
          { text: "", rationale: "" },
          { text: "", rationale: "" },
        ],
        correctAnswerIndex: 0,
        hazards: [{ text: "", rationale: "", isRequired: true }],
        sequenceSteps: [{ text: "", order: 1 }],
      });

      setFormErrors({});
      toast.success("Situational scenario added to step!");
    } catch (error) {
      console.error("Failed to add scenario:", error);
      toast.error(`System Error: Failed to add scenario. ${error.message}`);
    }
  };

  return {
    stagedFlows,
    setStagedFlows,
    currentFlowStep,
    setCurrentFlowStep,
    currentQuizQuestion,
    setCurrentQuizQuestion,
    currentSituationalData,
    setCurrentSituationalData,
    situationalImage,
    setSituationalImage,
    writtenMaterialFile,
    setWrittenMaterialFile,
    editingStepId,
    addStepToFlow,
    addQuizQuestionToStep,
    addSituationalScenarioToStep,
    handleEditStep,
  };
}