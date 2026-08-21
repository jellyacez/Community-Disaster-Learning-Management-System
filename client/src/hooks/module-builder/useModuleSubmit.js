import toast from "react-hot-toast";
import apiClient from "../../lib/apiClient";

export function useModuleSubmit({
  moduleForm,
  stagedLevels,
  stagedFlows,
  setEditingModuleId,
  setModuleForm,
  setStagedFlows,
  setStagedLevels,
  setActiveLevelOrder,
  setFormErrors
}) {
  const handleModuleSubmit = async (e, targetStatus = "pending_review") => {
    if (e && e.preventDefault) e.preventDefault();
    
    const errors = {};
    
    if (!moduleForm.title.trim()) errors.title = "A module topic title is required.";
    if (!moduleForm.description.trim() || moduleForm.description === "<p></p>") errors.description = "A short description or summary is required for the module overview.";
    
    const emptyTitleLevel = stagedLevels.find(lvl => !lvl.levelTitle.trim());
    if (emptyTitleLevel) {
      errors.levelTitle = "One or more curriculum levels are missing a valid title.";
      setActiveLevelOrder(emptyTitleLevel.levelOrder);
    } else {
      const emptyStepsLevel = stagedLevels.find(lvl => !stagedFlows.some(flow => flow.levelOrder === lvl.levelOrder));
      if (emptyStepsLevel) {
        errors.flows = `Level ${emptyStepsLevel.levelOrder} must contain at least one instructional or assessment step before publishing.`;
        setActiveLevelOrder(emptyStepsLevel.levelOrder);
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("System Error: Module validation failed. Please review the highlighted fields before publishing.");
      return false;
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
             throw new Error(`Upload failed for Step ${i+1}: ${err.response?.data?.message || err.message}`, { cause: err });
          }
        }
        uploadedFlows.push({ ...activeFlow, finalMediaUrl });
      }

      toast.loading("Synchronizing module data to database...", { id: loadingToastId });

      // 2. CREATE NESTED PAYLOAD
      const levelsPayload = stagedLevels.map(lvl => {
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
             } else if (flow.assessmentType === "situational" && flow.situationalScenarios?.length > 0) {
                 questionsToSave = flow.situationalScenarios.map(scenario => {
                     const interaction = scenario.interactionType;
                     let options = [];
                     
                     if (interaction === "priority_action") {
                         options = scenario.options.map((opt, optIdx) => ({
                             text: opt.text,
                             isCorrect: optIdx === scenario.correctAnswerIndex,
                             rationale: opt.rationale
                         }));
                     } else if (interaction === "hazard_identification") {
                         options = scenario.hazards.map((hazard) => ({
                             text: hazard.text,
                             isCorrect: hazard.isRequired,
                             rationale: hazard.rationale
                         }));
                     } else if (interaction === "action_sequence") {
                         options = scenario.sequenceSteps.map((step) => ({
                             text: step.text,
                             isCorrect: true,
                             sequence_order: step.order
                         }));
                     }
                     
                     return {
                         questionText: scenario.scenarioDescription,
                         imageURL: '',
                         options: options
                     };
                 });
              }
             
             return {
                 stepOrder: index + 1,
                 stepTitle: flow.title,
                 stepContent: flow.type === "text" ? flow.textContent : "",
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
        levels: levelsPayload,
        status: targetStatus
      };

      await apiClient.post("modules", modulePayload);

      toast.success("Syllabus configuration successfully published to the production database.", { id: loadingToastId });
      setEditingModuleId(null);
      setModuleForm({ title: "", description: "", level: "Level 1", category: "General", duration: "15 mins", image_url: "" });
      setStagedFlows([]);
      setStagedLevels([{ levelOrder: 1, levelTitle: "", levelDescription: "", passing_threshold: 80, is_locked_by_default: false }]);
      setActiveLevelOrder(1);
      setFormErrors({});
      return true;
    } catch (error) {
      console.error("Critical error executing data synchronization processing:", error);
      toast.error(`Publication aborted: ${error.response?.data?.message || error.message}`, { id: loadingToastId });
      return false;
    }
  };

  return { handleModuleSubmit };
}
