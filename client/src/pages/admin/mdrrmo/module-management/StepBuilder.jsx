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
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col overflow-hidden sticky top-8 max-h-[calc(100vh-6rem)]">
      <div className="bg-gray-50 border-b border-gray-100 p-5 shrink-0 flex items-center justify-between">
         <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
               <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
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
          {formErrors.stepTitle && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{formErrors.stepTitle}</p>}
        </div>

        {/* Step Type Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
             Content Type
          </label>
          <div className="flex flex-col gap-2">
            {[
              { id: 'learning_material', label: 'Learning Material', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
              { id: 'quiz', label: 'Multiple Choice Quiz', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              { id: 'situational', label: 'Situational Assessment', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }
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
                <svg className={`w-5 h-5 ${currentFlowStep.builderStepType === tab.id ? 'text-red-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
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
           className="w-full py-3.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl shadow-md transition-all outline-none flex items-center justify-center gap-2"
         >
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
           Save Content to Sequence
         </button>
      </div>
    </div>
  );
}