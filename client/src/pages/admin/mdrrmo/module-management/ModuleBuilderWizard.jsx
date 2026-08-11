import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ModuleHeaderForm from "./ModuleHeaderForm";
import LevelSelector from "./LevelBuilder";
import SequenceCanvas from "./SequenceCanvas";
import StepBuilder from "./StepBuilder";
import ModulePlayerPreviewModal from "../../../../components/ui/modules/viewer/ModulePlayerPreviewModal";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

export default function ModuleBuilderWizard({
  isOpen,
  onClose,
  state,
  setters,
  actions,
  refetchModules,
  showPreviewModal,
  setShowPreviewModal,
}) {
  const [wizardStep, setWizardStep] = useState(1);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const navigate = useNavigate();

  const {
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
    editingStepId,
  } = state;

  const {
    setModuleForm,
    setStagedLevels,
    setActiveLevelOrder,
    setStagedFlows,
    setCurrentFlowStep,
    setCurrentQuizQuestion,
    setCurrentSituationalData,
    setSituationalImage,
    setWrittenMaterialFile,
    setFormErrors,
  } = setters;

  const {
    addStepToFlow,
    addQuizQuestionToStep,
    handleModuleSubmit,
    handleEditStep,
  } = actions;

  useEffect(() => {
    if (formErrors.flows || formErrors.levelTitle) {
      // Use a small timeout inside the effect to ensure React has fully painted the new tab
      const timer = setTimeout(() => {
        const targetId = formErrors.levelTitle ? "level-title-error-anchor" : "sequence-error-anchor";
        const errorEl = document.getElementById(targetId);
        if (errorEl) {
          errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [formErrors.flows, formErrors.levelTitle, activeLevelOrder]);

  if (!isOpen) return null;

  const handleNextStep = () => {
    // Basic validation before allowing next step
    if (wizardStep === 1) {
      if (!moduleForm.title || !moduleForm.description || !moduleForm.category || !moduleForm.duration || !moduleForm.level) {
        setFormErrors({
          title: !moduleForm.title ? "Title is required" : "",
          description: !moduleForm.description ? "Description is required" : "",
          category: !moduleForm.category ? "Category is required" : "",
          duration: !moduleForm.duration ? "Duration is required" : "",
          level: !moduleForm.level ? "Level is required" : "",
        });
        return;
      }
    }
    setWizardStep((prev) => Math.min(prev + 1, 2));
  };

  const handleSubmitWrapper = async (e) => {
    e.preventDefault();
    const success = await handleModuleSubmit(e);
    if (!success) return; 
    
    if (refetchModules) {
      refetchModules();
    }
    // Reset wizard state so reopening always starts fresh on Step 1
    actions.resetForm();
    setWizardStep(1);
    onClose();
    navigate("/admin/mdrrmo/modules");
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-50/95 backdrop-blur-sm overflow-hidden">
      {/* Wizard Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowExitModal(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-gray-900 tracking-tight">
              {editingModuleId ? "Edit Learning Path" : "Create Learning Path"}
            </h1>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
              <span className={wizardStep === 1 ? "text-red-600" : ""}>
                Step 1: Overview
              </span>
              <span className="text-gray-300">/</span>
              <span className={wizardStep === 2 ? "text-red-600" : ""}>
                Step 2: Add Content
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {wizardStep === 2 && (
            <button
              type="button"
              onClick={() => setWizardStep(1)}
              className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
              Overview
            </button>
          )}

          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            Reset
          </button>

          {wizardStep === 1 ? (
            <button
              onClick={handleNextStep}
              className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
            >
              Next: Add Content
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmitWrapper}
              className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
            >
              {editingModuleId ? "Submit Changes for Review" : "Submit for Review"}
            </button>
          )}
        </div>
      </div>

      {/* Wizard Content Area */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div
          className={`mx-auto transition-all duration-300 ${wizardStep === 1 ? "max-w-4xl" : "max-w-6xl"}`}
        >
          {wizardStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <ModuleHeaderForm
                editingModuleId={editingModuleId}
                moduleForm={moduleForm}
                setModuleForm={setModuleForm}
                formErrors={formErrors}
                setFormErrors={setFormErrors}
              />
            </div>
          )}

          {wizardStep === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-8">
              <LevelSelector
                stagedLevels={stagedLevels}
                setStagedLevels={setStagedLevels}
                activeLevelOrder={activeLevelOrder}
                setActiveLevelOrder={setActiveLevelOrder}
                stagedFlows={stagedFlows}
                setStagedFlows={setStagedFlows}
                formErrors={formErrors}
              />

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-8">
                  <SequenceCanvas
                    stagedFlows={stagedFlows}
                    setStagedFlows={setStagedFlows}
                    activeLevelOrder={activeLevelOrder}
                    triggerFlowSequencePreview={() => setShowPreviewModal(true)}
                    handleEditStep={handleEditStep}
                    formError={formErrors.flows}
                    moduleStatus={moduleForm.status}
                  />
                  {formErrors.flows && stagedFlows.filter(flow => flow.levelOrder === activeLevelOrder).length > 0 && (
                    <div id="sequence-error-anchor" className="animate-in fade-in slide-in-from-top-2 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                         <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-red-800">Validation Error</h4>
                        <p className="text-red-600 text-sm mt-0.5">
                          {formErrors.flows}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="xl:col-span-4 sticky top-0">
                  <StepBuilder
                    currentFlowStep={currentFlowStep}
                    setCurrentFlowStep={setCurrentFlowStep}
                    writtenMaterialFile={writtenMaterialFile}
                    setWrittenMaterialFile={setWrittenMaterialFile}
                    currentQuizQuestion={currentQuizQuestion}
                    setCurrentQuizQuestion={setCurrentQuizQuestion}
                    currentSituationalData={currentSituationalData}
                    setCurrentSituationalData={setCurrentSituationalData}
                    addQuizQuestionToStep={addQuizQuestionToStep}
                    situationalImage={situationalImage}
                    setSituationalImage={setSituationalImage}
                    addStepToFlow={addStepToFlow}
                    addSituationalScenarioToStep={actions.addSituationalScenarioToStep}
                    activeLevelOrder={activeLevelOrder}
                    stagedFlows={stagedFlows}
                    formErrors={formErrors}
                    setFormErrors={setFormErrors}
                    editingStepId={editingStepId}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ModulePlayerPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        moduleForm={moduleForm}
        stagedFlows={stagedFlows}
      />

      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={() => {
          actions.resetForm();
          setShowResetModal(false);
          setWizardStep(1);
        }}
        title="Reset Builder"
        description="Are you sure you want to completely clear this module? All levels, steps, and unsaved configurations will be permanently lost."
        confirmText="Yes, Wipe Slate Clean"
        type="danger"
      />

      <ConfirmationModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={() => {
          // Also reset on exit so reopening doesn't show stale data
          actions.resetForm();
          setWizardStep(1);
          setShowExitModal(false);
          onClose();
          navigate("/admin/mdrrmo/modules");
        }}
        alternateText="Save as Draft & Exit"
        onAlternateAction={async () => {
          const success = await handleModuleSubmit(
            new Event("submit"),
            "draft"
          );
          if (success) {
            if (refetchModules) refetchModules();
            actions.resetForm();
            setWizardStep(1);
            setShowExitModal(false);
            onClose();
            navigate("/admin/mdrrmo/modules");
          } else {
             setShowExitModal(false);
          }
        }}
        title="Exit Builder?"
        description="Are you sure you want to exit? Any unsaved progress will be lost. You can choose to save your progress as a draft instead."
        confirmText="Discard & Exit"
        type="danger"
      />
    </div>
  );
}
