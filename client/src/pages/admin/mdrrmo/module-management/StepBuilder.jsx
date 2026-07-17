import AssessmentEditor from "./AssessmentEditor";
import LearningContentEditor from "./step-components/LearningContentEditor";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Edit01Icon, 
  Alert01Icon, 
  File01Icon, 
  Task01Icon, 
  Target01Icon, 
  RefreshIcon, 
  CheckmarkBadge01Icon 
} from "@hugeicons/core-free-icons";

export default function StepBuilder({ 
  currentFlowStep, 
  setCurrentFlowStep, 
  writtenMaterialFile, 
  setWrittenMaterialFile, 
  currentQuizQuestion, 
  setCurrentQuizQuestion, 
  currentSituationalData,
  setCurrentSituationalData,
  addQuizQuestionToStep, 
  situationalImage, 
  setSituationalImage, 
  addStepToFlow,
  activeLevelOrder = 1,
  stagedFlows = [],
  formErrors = {},
  setFormErrors,
  editingStepId
}) {

  const handleFieldChange = (field, value) => {
    setCurrentFlowStep({ ...currentFlowStep, [field]: value });
    const errorKey = field === 'title' ? 'stepTitle' : field === 'textContent' ? 'stepContent' : field;
    
    if (formErrors[errorKey]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleSaveClick = () => {
    if (!currentFlowStep.title.trim()) {
      return toast.error("Please enter a title for the step before saving.");
    }
    
    const success = addStepToFlow(); // Execute the save pipeline
    if (success) {
      toast.success(`Saved step "${currentFlowStep.title}" into Level ${activeLevelOrder}!`);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col overflow-hidden sticky top-8 max-h-[calc(100vh-6rem)]">
      <div className="bg-gray-50 border-b border-gray-100 p-5 shrink-0 flex items-center justify-between">
         <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
               <HugeiconsIcon icon={Edit01Icon} className="w-5 h-5 text-red-500" />
               Step Configurator
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5 ml-7">Drafting for Level {activeLevelOrder}</p>
         </div>
      </div>
      
      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
            Step Title Name
          </label>
          <input 
            type="text" 
            placeholder="Enter a descriptive step title..." 
            value={currentFlowStep.title} 
            onChange={(e) => handleFieldChange('title', e.target.value)} 
            className={`w-full p-3.5 bg-gray-50 hover:bg-gray-100 border ${formErrors.stepTitle ? 'border-red-500 ring-2 ring-red-500/10' : 'border-transparent focus:border-red-200 focus:bg-white focus:ring-4 focus:ring-red-500/10'} rounded-xl text-sm font-bold text-gray-900 outline-none transition-all placeholder-gray-400`} 
          />
          {formErrors.stepTitle && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1"><HugeiconsIcon icon={Alert01Icon} className="w-4 h-4" />{formErrors.stepTitle}</p>}
        </div>

        {/* Step Type Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
             Content Type
          </label>
          <div className="flex flex-col gap-2">
            {[
              { id: 'learning_material', label: 'Learning Material', icon: File01Icon },
              { id: 'quiz', label: 'Multiple Choice Quiz', icon: Task01Icon },
              { id: 'situational', label: 'Situational Assessment', icon: Target01Icon }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleFieldChange('builderStepType', tab.id)}
                className={`flex items-center gap-3 w-full p-3.5 rounded-xl transition-all font-bold text-sm text-left border ${
                  currentFlowStep.builderStepType === tab.id 
                    ? "bg-red-50 border-red-200 text-red-700 shadow-sm ring-1 ring-red-500" 
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                <HugeiconsIcon icon={tab.icon} className={`w-5 h-5 ${currentFlowStep.builderStepType === tab.id ? 'text-red-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {currentFlowStep.builderStepType === "learning_material" && (
          <div className="pt-2 border-t border-gray-100">
             <LearningContentEditor 
               currentFlowStep={currentFlowStep}
               handleFieldChange={handleFieldChange}
               formErrors={formErrors}
               writtenMaterialFile={writtenMaterialFile}
               setWrittenMaterialFile={setWrittenMaterialFile}
             />
          </div>
        )}

        {(currentFlowStep.builderStepType === "quiz" || currentFlowStep.builderStepType === "situational") && (
          <div className="pt-2 border-t border-gray-100">
             <AssessmentEditor 
               currentFlowStep={currentFlowStep}
               setCurrentFlowStep={setCurrentFlowStep}
               currentQuizQuestion={currentQuizQuestion}
               setCurrentQuizQuestion={setCurrentQuizQuestion}
               currentSituationalData={currentSituationalData}
               setCurrentSituationalData={setCurrentSituationalData}
               addQuizQuestionToStep={addQuizQuestionToStep}
               situationalImage={situationalImage}
               setSituationalImage={setSituationalImage}
               hasFinalAssessmentInLevel={stagedFlows.some(f => f.levelOrder === activeLevelOrder && f.is_final_assessment && f.id !== currentFlowStep.id)}
               formErrors={formErrors}
               setFormErrors={setFormErrors}
             />
          </div>
        )}
      </div>

      <div className="p-5 border-t border-gray-100 bg-gray-50 shrink-0">
         <button 
           type="button" 
           onClick={handleSaveClick} 
           className={`w-full py-3.5 text-white text-sm font-bold rounded-xl shadow-md transition-all outline-none flex items-center justify-center gap-2 ${editingStepId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-black'}`}
         >
           {editingStepId ? (
             <>
               <HugeiconsIcon icon={RefreshIcon} className="w-5 h-5" />
               Update Content in Sequence
             </>
           ) : (
             <>
               <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-5 h-5" />
               Save Content to Sequence
             </>
           )}
         </button>
      </div>
    </div>
  );
}