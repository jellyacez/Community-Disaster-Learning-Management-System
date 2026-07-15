import AssessmentEditor from "./AssessmentEditor";
import LearningContentEditor from "./step-components/LearningContentEditor";
import toast from "react-hot-toast";
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
  formErrors = {},
  setFormErrors
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
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <h3 className="text-md font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3">
        Step Content Configuration Builder
      </h3>
      
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
          Step Title Name
        </label>
        <input 
          type="text" 
          placeholder="Enter a descriptive step title..." 
          value={currentFlowStep.title} 
          onChange={(e) => handleFieldChange('title', e.target.value)} 
          className={`w-full p-3 bg-white border ${formErrors.stepTitle ? 'border-red-500' : 'border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'} rounded-xl text-sm font-medium outline-none transition-all`} 
        />
        {formErrors.stepTitle && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.stepTitle}</p>}
      </div>

      {/* Step Type Selector */}
      <div className="flex bg-slate-100 p-1 rounded-xl">
        {[
          { id: 'learning_material', label: 'Learning Material (Text/Video)' },
          { id: 'quiz', label: 'Multiple Choice Quiz' },
          { id: 'situational', label: 'Situational Assessment' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleFieldChange('builderStepType', tab.id)}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
              currentFlowStep.builderStepType === tab.id 
                ? "bg-white text-slate-800 shadow-sm border border-slate-200" 
                : "text-slate-500 hover:bg-slate-200/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {currentFlowStep.builderStepType === "learning_material" && (
        <LearningContentEditor 
          currentFlowStep={currentFlowStep}
          handleFieldChange={handleFieldChange}
          formErrors={formErrors}
          writtenMaterialFile={writtenMaterialFile}
          setWrittenMaterialFile={setWrittenMaterialFile}
        />
      )}

      {(currentFlowStep.builderStepType === "quiz" || currentFlowStep.builderStepType === "situational") && (
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
          formErrors={formErrors}
          setFormErrors={setFormErrors}
        />
      )}

      <button 
        type="button" 
        onClick={handleSaveClick} 
        className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-sm font-bold rounded-xl text-slate-700 shadow-sm transition-all outline-none"
      >
        + Save Micro-Learning Step to Level {activeLevelOrder}
      </button>
    </div>
  );
}