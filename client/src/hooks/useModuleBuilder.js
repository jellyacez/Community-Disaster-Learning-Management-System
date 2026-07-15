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
    addStepToFlow, addQuizQuestionToStep
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
      addStepToFlow: () => addStepToFlow(formErrors),
      addQuizQuestionToStep: () => addQuizQuestionToStep(formErrors),
      handleModuleSubmit,
      triggerFlowSequencePreview
    }
  };
}
