import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import apiClient from "../lib/apiClient";
import { useModuleForm } from "./module-builder/useModuleForm";
import { useLevelManager } from "./module-builder/useLevelManager";
import { useStepStager } from "./module-builder/useStepStager";
import { useModuleSubmit } from "./module-builder/useModuleSubmit";
import { decodeHtml } from "../utils/textUtils";

export function useModuleBuilder() {
  const [formErrors, setFormErrors] = useState({});
  const [isLoadingModule, setIsLoadingModule] = useState(false);

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
    addStepToFlow, addQuizQuestionToStep, addSituationalScenarioToStep, handleEditStep
  } = useStepStager(activeLevelOrder, setFormErrors);

  const { handleModuleSubmit } = useModuleSubmit({
    moduleForm,
    stagedLevels,
    stagedFlows,
    editingModuleId,
    setEditingModuleId,
    setModuleForm,
    setStagedFlows,
    setStagedLevels,
    setActiveLevelOrder,
    setFormErrors
  });

  const loadModuleForEdit = useCallback(async (moduleId) => {
    if (!moduleId) return;

    try {
      setIsLoadingModule(true);
      const res = await apiClient.get(`modules/${moduleId}/edit-details`);
      const data = res.data.data;

      if (!data) throw new Error("Module not found");

      setEditingModuleId(data.mod_id);
      setModuleForm({
        title: decodeHtml(data.modname) || "",
        category: data.modcat || "General",
        level: data.level || "Level 1",
        duration: data.duration || "15 mins",
        description: data.description || "",
        image_url: data.image_url || ""
      });

      // Hydrate Levels (NOW INCLUDES COVER_IMAGE)
      const levels = (data.levels || []).map((lvl) => ({
        levelId: lvl.levelId || lvl.level_id,
        levelOrder: lvl.levelOrder ?? lvl.level_order,
        levelTitle: decodeHtml(lvl.levelTitle || lvl.level_title) || "",
        levelDescription: lvl.levelDescription || lvl.level_description || "",
        passing_threshold: lvl.passing_threshold || 80,
        is_locked_by_default: lvl.is_locked_by_default ?? true,
        // Hydrate both keys so builder components and submit hooks receive the image
        cover_image: lvl.cover_image || lvl.coverImage || null,
        coverImage: lvl.cover_image || lvl.coverImage || null
      }));

      setStagedLevels(
        levels.length > 0
          ? levels
          : [{ levelOrder: 1, levelTitle: "", levelDescription: "", passing_threshold: 80, is_locked_by_default: false, cover_image: null, coverImage: null }]
      );
      setActiveLevelOrder(1);

      // Hydrate Flows / Steps
      const flows = [];
      (data.levels || []).forEach((lvl) => {
        const currentOrder = lvl.levelOrder ?? lvl.level_order;
        (lvl.steps || []).forEach((step) => {
          flows.push({
            id: `step-${currentOrder}-${step.stepOrder || step.step_order}-${Date.now()}-${Math.random()}`,
            levelOrder: currentOrder,
            title: decodeHtml(step.stepTitle || step.step_title) || "",
            type: step.stepType || step.step_type || "text",
            textContent: (step.stepType || step.step_type) === "text" ? (step.stepContent || step.step_content || "") : "",
            mediaUrl: step.mediaUrl || step.media_url || "",
            finalMediaUrl: step.mediaUrl || step.media_url || "",
            is_final_assessment: step.is_final_assessment || false,
            quizQuestions: (step.quizQuestions || []).map((q) => {
              const correctIdx = (q.options || []).findIndex((opt) => opt.isCorrect);
              return {
                questionText: decodeHtml(q.questionText) || "",
                correctAnswerIndex: correctIdx >= 0 ? correctIdx : 0,
                options: (q.options || []).map((opt) => ({
                  text: decodeHtml(opt.text) || "",
                  rationale: decodeHtml(opt.rationale) || "",
                  isCorrect: opt.isCorrect || false,
                  sequence_order: opt.sequence_order
                }))
              };
            })
          });
        });
      });

      setStagedFlows(flows);
      toast.success(`Loaded module "${decodeHtml(data.modname)}" for editing.`);
    } catch (err) {
      console.error("Failed to load module for edit:", err);
      toast.error(`Failed to load module: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoadingModule(false);
    }
  }, [setEditingModuleId, setModuleForm, setStagedLevels, setActiveLevelOrder, setStagedFlows]);

  const triggerFlowSequencePreview = () => {
    if (stagedFlows.length === 0) {
      toast.error("System Error: No curriculum sequences detected. Please stage at least one sequence step to initiate the preview.");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setEditingModuleId(null);
    setModuleForm({ title: "", category: "General", level: "Level 1", duration: "15 mins", description: "", image_url: "" });
    setStagedLevels([{ levelOrder: 1, levelTitle: "", levelDescription: "", passing_threshold: 80, is_locked_by_default: false, cover_image: null, coverImage: null }]);
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
      isLoadingModule,
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
      addSituationalScenarioToStep: () => addSituationalScenarioToStep(formErrors),
      handleModuleSubmit,
      triggerFlowSequencePreview,
      resetForm,
      handleEditStep,
      loadModuleForEdit
    }
  };
}