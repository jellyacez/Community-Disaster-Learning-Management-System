import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ModuleHeaderForm from "./ModuleHeaderForm";
import LevelSelector from "./LevelBuilder"; 
import SequenceCanvas from "./SequenceCanvas";
import StepBuilder from "./StepBuilder";
import ModuleCard from "../../../../components/ui/modules/ModuleCard";
import ModulePlayerPreviewModal from "../../../../components/ui/modules/viewer/ModulePlayerPreviewModal";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";
import StickyBuilderNav from "./StickyBuilderNav";
import apiClient from "../../../../lib/apiClient";
import { useModuleBuilder } from "../../../../hooks/useModuleBuilder";

const fetchModules = async () => {
  const res = await apiClient.get("/modules/available"); 
  return res.data;
};

export default function ModuleManagement() {
  const { isLoading, isError } = useQuery({
    queryKey: ["adminModules"],
    queryFn: fetchModules,
    retry: 1
  });

  const { state, setters, actions } = useModuleBuilder();
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
    triggerFlowSequencePreview
  } = actions;

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-3 text-gray-500 font-medium">Loading Module Builder...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
        <p className="font-bold">Error loading module builder.</p>
        <p className="text-sm">Please ensure the backend routes are connected.</p>
      </div>
    );
  }

  // Create a mock module object for the live preview card
  const previewModule = {
    id: "preview",
    title: moduleForm.title || "Module Title Preview",
    category: moduleForm.category,
    level: moduleForm.level,
    duration: moduleForm.duration,
    description: moduleForm.description || "Start typing a description to see it here...",
    image_url: moduleForm.image_url,
    progress: 0,
    status: "Not Started"
  };

  const handlePreviewClick = () => {
    if (!triggerFlowSequencePreview()) return;
    setShowPreviewModal(true);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto animate-in fade-in duration-150 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form Builder */}
          <div className="lg:col-span-7 space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-800">Module Builder</h2>
            </div>
            
            <form onSubmit={handleModuleSubmit} className="space-y-6 relative">
              <StickyBuilderNav 
                onReset={() => setShowResetModal(true)}
                showReset={!editingModuleId}
              />

              <section id="module-details" className="scroll-mt-28">
                <ModuleHeaderForm 
                  editingModuleId={editingModuleId}
                  moduleForm={moduleForm}
                  setModuleForm={setModuleForm}
                  formErrors={formErrors}
                  setFormErrors={setFormErrors}
                />
              </section>

              <section id="phases-levels" className="scroll-mt-28">
                <LevelSelector 
                  stagedLevels={stagedLevels}
                  setStagedLevels={setStagedLevels}
                  activeLevelOrder={activeLevelOrder}
                  setActiveLevelOrder={setActiveLevelOrder}
                  stagedFlows={stagedFlows}
                  setStagedFlows={setStagedFlows}
                />
              </section>

              <section id="sequence-canvas" className="scroll-mt-28">
                <SequenceCanvas 
                  stagedFlows={stagedFlows}
                  setStagedFlows={setStagedFlows}
                  activeLevelOrder={activeLevelOrder}
                  triggerFlowSequencePreview={handlePreviewClick}
                />
              </section>
              
              {formErrors.flows && (
                <p className="text-red-500 text-xs font-bold px-2">{formErrors.flows}</p>
              )}

              <section id="step-builder" className="scroll-mt-28">
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
              </section>

              <button 
                type="submit" 
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm uppercase tracking-wider shadow-md transition-colors"
              >
                {editingModuleId ? "Commit Changes to Syllabus" : "Publish Training Module Layout"}
              </button>
            </form>
          </div>

          {/* Right Column: Live Card Preview */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider pl-2 border-l-4 border-red-600">
                Resident Dashboard Preview
              </h3>
              <p className="text-xs text-gray-500 mb-4 pl-2">
                This is a live preview of how this module will appear on the resident's Enrolled Modules page.
              </p>
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 z-10" onClick={handlePreviewClick}></div>
                <ModuleCard 
                  module={previewModule} 
                  enrolled={true} 
                  isPreview={true} 
                  onPreviewClick={handlePreviewClick} 
                />
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-none">Click to Launch Live Viewer</span>
                </div>
              </div>
            </div>
          </div>

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
          // Reset everything to defaults
          setModuleForm({ title: "", category: "General Safety / Protocols", level: "Level 1", duration: "15 mins", description: "", image_url: "" });
          setStagedLevels([{ levelOrder: 1, levelTitle: "", levelDescription: "", passing_threshold: 80, is_locked_by_default: false }]);
          setActiveLevelOrder(1);
          setStagedFlows([]);
          setCurrentFlowStep({ builderStepType: "learning_material", type: "text", title: "", textContent: "", mediaUrl: null, videoUrl: null, is_final_assessment: false });
          setCurrentQuizQuestion({ questionText: "", correctAnswerIndex: 0, options: [{ text: "", rationale: "" }] });
          setCurrentSituationalData({ interactionType: "priority_action", options: [], hazards: [], sequenceSteps: [] });
          setFormErrors({});
          setShowResetModal(false);
        }}
        title="Reset Builder"
        description="Are you sure you want to completely clear this module? All levels, steps, and unsaved configurations will be permanently lost."
        confirmText="Yes, Wipe Slate Clean"
        type="danger"
      />
    </>
  );
}
