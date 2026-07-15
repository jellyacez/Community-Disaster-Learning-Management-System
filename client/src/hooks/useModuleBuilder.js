import { useState } from "react";
import toast from "react-hot-toast";
import { useModuleForm } from "./module-builder/useModuleForm";
import { useLevelManager } from "./module-builder/useLevelManager";
import { useStepStager } from "./module-builder/useStepStager";
import { useModuleSubmit } from "./module-builder/useModuleSubmit";

export function useModuleBuilder() {
  const [formErrors, setFormErrors] = useState({});

  const {
    editingModuleId, setEditingModuleId,
    moduleForm, setModuleForm
  } = useModuleForm();

  const {
    stagedLevels, setStagedLevels,
    activeLevelOrder, setActiveLevelOrder
  } = useLevelManager();

  const {
    stagedFlows, setStagedFlows,
    currentFlowStep, setCurrentFlowStep,
    currentQuizQuestion, setCurrentQuizQuestion,
    currentSituationalData, setCurrentSituationalData,
    situationalImage, setSituationalImage,
    writtenMaterialFile, setWrittenMaterialFile,
    editingStepId, setEditingStepId,
    addStepToFlow, addQuizQuestionToStep, handleEditStep
  } = useStepStager(activeLevelOrder, setFormErrors);

  const { handleModuleSubmit } = useModuleSubmit({
    moduleForm,
    stagedLevels,
    stagedFlows,
    setEditingModuleId,
    setModuleForm,
    setStagedFlows,
    setStagedLevels,
    setActiveLevelOrder,
    setFormErrors
  });

  const triggerFlowSequencePreview = () => {
    if (stagedFlows.length === 0) {
      toast.error("System Error: No curriculum sequences detected. Please stage at least one sequence step to initiate the preview.");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setEditingModuleId(null);
    setModuleForm({ title: "", category: "General Safety / Protocols", level: "Level 1", duration: "15 mins", description: "", image_url: "" });
    setStagedLevels([{ levelOrder: 1, levelTitle: "", levelDescription: "", passing_threshold: 80, is_locked_by_default: false }]);
    setActiveLevelOrder(1);
    setStagedFlows([]);
    setCurrentFlowStep({ builderStepType: "learning_material", type: "text", title: "", textContent: "", videoUrl: "", assessmentType: "quiz", quizQuestions: [], situationalScenario: "", is_final_assessment: false });
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
    setCurrentSituationalData({ 
      interactionType: "priority_action", 
      options: [
        { text: "", rationale: "" },
        { text: "", rationale: "" },
        { text: "", rationale: "" },
        { text: "", rationale: "" }
      ], 
      hazards: [], 
      sequenceSteps: [] 
    });
    setFormErrors({});
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
      formErrors,
      editingStepId
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
      addStepToFlow: () => addStepToFlow(formErrors),
      addQuizQuestionToStep: () => addQuizQuestionToStep(formErrors),
      handleModuleSubmit,
      triggerFlowSequencePreview,
      resetForm,
      handleEditStep
    }
  };
}
