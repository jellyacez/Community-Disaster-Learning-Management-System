import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ModuleHeaderForm from "./ModuleHeaderForm";
import SequenceCanvas from "./SequenceCanvas";
import StepBuilder from "./StepBuilder";
import ModuleCard from "../../../../components/ui/modules/ModuleCard";
import ModulePlayerPreviewModal from "../../../../components/ui/modules/viewer/ModulePlayerPreviewModal";
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
    stagedFlows,
    currentFlowStep,
    currentQuizQuestion,
    situationalImage,
    writtenMaterialFile,
    formErrors
  } = state;

  const {
    setModuleForm,
    setStagedFlows,
    setCurrentFlowStep,
    setCurrentQuizQuestion,
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
    progress: 100, // Show completed state to preview all badges
    status: "Completed"
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
            <form onSubmit={handleModuleSubmit} className="space-y-6">
              <ModuleHeaderForm 
                editingModuleId={editingModuleId}
                moduleForm={moduleForm}
                setModuleForm={setModuleForm}
                formErrors={formErrors}
                setFormErrors={setFormErrors}
              />

              <SequenceCanvas 
                stagedFlows={stagedFlows}
                setStagedFlows={setStagedFlows}
                triggerFlowSequencePreview={handlePreviewClick}
              />
              
              {formErrors.flows && (
                <p className="text-red-500 text-xs font-bold px-2">{formErrors.flows}</p>
              )}

              <StepBuilder 
                currentFlowStep={currentFlowStep}
                setCurrentFlowStep={setCurrentFlowStep}
                writtenMaterialFile={writtenMaterialFile}
                setWrittenMaterialFile={setWrittenMaterialFile}
                currentQuizQuestion={currentQuizQuestion}
                setCurrentQuizQuestion={setCurrentQuizQuestion}
                addQuizQuestionToStep={addQuizQuestionToStep}
                situationalImage={situationalImage}
                setSituationalImage={setSituationalImage}
                addStepToFlow={addStepToFlow}
                formErrors={formErrors}
                setFormErrors={setFormErrors}
              />

              <button 
                type="submit" 
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm uppercase tracking-wider shadow-md transition-colors"
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
              <div className="pointer-events-none">
                <ModuleCard 
                  module={previewModule} 
                  enrolled={true} 
                  isPreview={true} 
                  onPreviewClick={handlePreviewClick} 
                />
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
    </>
  );
}
