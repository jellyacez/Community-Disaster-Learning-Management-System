import AssessmentEditor from "./AssessmentEditor";
import RichTextEditor from "../../../../components/ui/RichTextEditor";
import toast from "react-hot-toast";

export default function StepBuilder({ 
  currentFlowStep, 
  setCurrentFlowStep, 
  writtenMaterialFile, 
  setWrittenMaterialFile, 
  currentQuizQuestion, 
  setCurrentQuizQuestion, 
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
    
    addStepToFlow(); // Execute the save pipeline
    toast.success(`Saved step "${currentFlowStep.title}" into Level ${activeLevelOrder}!`);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
      <h3 className="text-md font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-3">
        Step Content Configuration Builder
      </h3>
      
      <div>
        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-1.5">
          Step Title Name
        </label>
        <input 
          type="text" 
          placeholder="Enter a descriptive step title..." 
          value={currentFlowStep.title} 
          onChange={(e) => handleFieldChange('title', e.target.value)} 
          className={`w-full p-3 bg-white border ${formErrors.stepTitle ? 'border-red-500' : 'border-gray-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'} rounded-xl text-sm font-medium outline-none transition-all`} 
        />
        {formErrors.stepTitle && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.stepTitle}</p>}
      </div>

      <div className="p-5 bg-slate-50 border border-gray-200 border-dashed rounded-xl space-y-6">
        
        {/* 1. Learning Content Instructions */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">1. Learning Content Instructions</h4>
          <div className="text-sm bg-white rounded-xl shadow-sm">
            <RichTextEditor 
              placeholder="Type detailed learning steps or instructional summary text..." 
              value={currentFlowStep.textContent} 
              onChange={(content) => handleFieldChange('textContent', content)} 
              className={`min-h-[140px] text-sm border ${formErrors.stepContent ? 'border-red-500' : 'border-gray-300'}`}
            />
          </div>
          {formErrors.stepContent && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.stepContent}</p>}
        </div>

        {/* 2. Media & Document Upload */}
        <div className="space-y-2 border-t border-gray-200 pt-5">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">2. Media & Document Upload</h4>
          <div className="flex flex-col gap-2.5 bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Select Reference File (Video, PDF, DOCX)
            </span>
            <input 
              type="file" 
              accept=".pdf, .docx, video/mp4, video/webm, video/ogg" 
              onChange={(e) => {
                const targetFile = e.target.files[0];
                if (targetFile) {
                  setWrittenMaterialFile(targetFile);
                  toast.success(`Media staged: ${targetFile.name}`);
                }
              }}
              className="text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:text-xs file:font-bold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 cursor-pointer transition-colors" 
            />
            {writtenMaterialFile && (
              <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-xs text-emerald-800 font-bold">Staged File: {writtenMaterialFile.name}</p>
                {writtenMaterialFile.type.startsWith("video/") && (
                  <video 
                    controls 
                    preload="metadata" 
                    className="w-full max-h-64 object-cover rounded-xl border border-gray-200 mt-2 shadow-sm"
                    src={URL.createObjectURL(writtenMaterialFile)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. Formative Assessment */}
        <div className="space-y-2 border-t border-gray-200 pt-5">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">3. Formative Assessment</h4>
          <AssessmentEditor 
            currentFlowStep={currentFlowStep}
            setCurrentFlowStep={setCurrentFlowStep}
            currentQuizQuestion={currentQuizQuestion}
            setCurrentQuizQuestion={setCurrentQuizQuestion}
            addQuizQuestionToStep={addQuizQuestionToStep}
            situationalImage={situationalImage}
            setSituationalImage={setSituationalImage}
            formErrors={formErrors}
            setFormErrors={setFormErrors}
          />
        </div>
      </div>

      <button 
        type="button" 
        onClick={handleSaveClick} 
        className="w-full py-3.5 bg-white hover:bg-gray-50 border border-gray-300 text-sm font-bold rounded-xl text-gray-700 shadow-sm transition-all outline-none"
      >
        + Save Micro-Learning Step to Level {activeLevelOrder}
      </button>
    </div>
  );
}