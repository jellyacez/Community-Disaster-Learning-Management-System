import { useState } from "react";
import ModuleHeaderForm from "./ModuleHeaderForm";
import LevelSelector from "./LevelBuilder"; 
import SequenceCanvas from "./SequenceCanvas";
import StepBuilder from "./StepBuilder";
import ModulePlayerPreviewModal from "../../../../components/ui/modules/viewer/ModulePlayerPreviewModal";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";

export default function ModuleBuilderWizard({
  isOpen,
  onClose,
  state,
  setters,
  actions,
  triggerFlowSequencePreview,
  showPreviewModal,
  setShowPreviewModal
}) {
  const [wizardStep, setWizardStep] = useState(1);
  const [showResetModal, setShowResetModal] = useState(false);

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
    formErrors
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
    setFormErrors
  } = setters;

  const {
    addStepToFlow,
    addQuizQuestionToStep,
    handleModuleSubmit,
  } = actions;

  if (!isOpen) return null;

  const handleNextStep = () => {
    // Basic validation before allowing next step
    if (wizardStep === 1) {
      if (!moduleForm.title || !moduleForm.description) {
        setFormErrors({
          title: !moduleForm.title ? "Title is required" : "",
          description: !moduleForm.description ? "Description is required" : ""
        });
        return;
      }
    }
    setWizardStep(prev => Math.min(prev + 1, 2));
  };

  const handleSubmitWrapper = async (e) => {
    e.preventDefault();
    await handleModuleSubmit(e);
    onClose(); // Close modal on successful submit
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-50/95 backdrop-blur-sm overflow-hidden">
      {/* Wizard Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-gray-900 tracking-tight">
              {editingModuleId ? "Edit Learning Path" : "Create Learning Path"}
            </h1>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
              <span className={wizardStep === 1 ? "text-red-600" : ""}>Step 1: Overview</span>
              <span className="text-gray-300">/</span>
              <span className={wizardStep === 2 ? "text-red-600" : ""}>Step 2: Add Content</span>
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
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          ) : (
            <button 
              onClick={handleSubmitWrapper}
              className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
            >
              {editingModuleId ? "Publish Changes" : "Publish Learning Path"}
            </button>
          )}
        </div>
      </div>

      {/* Wizard Content Area */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className={`mx-auto transition-all duration-300 ${wizardStep === 1 ? 'max-w-4xl' : 'max-w-6xl'}`}>
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
              />
              
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-8">
                  <SequenceCanvas 
                    stagedFlows={stagedFlows}
                    setStagedFlows={setStagedFlows}
                    activeLevelOrder={activeLevelOrder}
                    triggerFlowSequencePreview={() => setShowPreviewModal(true)}
                  />
                  {formErrors.flows && (
                    <p className="text-red-500 text-xs font-bold px-2 mt-2">{formErrors.flows}</p>
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
                    activeLevelOrder={activeLevelOrder}
                    formErrors={formErrors}
                    setFormErrors={setFormErrors}
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
          setModuleForm({ title: "", category: "General Safety / Protocols", level: "Level 1", duration: "15 mins", description: "", image_url: "" });
          setStagedLevels([{ levelOrder: 1, levelTitle: "", levelDescription: "", passing_threshold: 80, is_locked_by_default: false }]);
          setActiveLevelOrder(1);
          setStagedFlows([]);
          setCurrentFlowStep({ builderStepType: "learning_material", type: "text", title: "", textContent: "", mediaUrl: null, videoUrl: null, is_final_assessment: false });
          setCurrentQuizQuestion({ questionText: "", correctAnswerIndex: 0, options: [{ text: "", rationale: "" }] });
          setCurrentSituationalData({ interactionType: "priority_action", options: [], hazards: [], sequenceSteps: [] });
          setFormErrors({});
          setShowResetModal(false);
          setWizardStep(1);
        }}
        title="Reset Builder"
        description="Are you sure you want to completely clear this module? All levels, steps, and unsaved configurations will be permanently lost."
        confirmText="Yes, Wipe Slate Clean"
        type="danger"
      />
    </div>
  );
}
