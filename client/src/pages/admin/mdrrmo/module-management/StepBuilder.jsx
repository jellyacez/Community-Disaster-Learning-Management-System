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
  formErrors = {},
  setFormErrors
}) {

  const handleFieldChange = (field, value) => {
    setCurrentFlowStep({ ...currentFlowStep, [field]: value });
    
    // Map the state fields to the corresponding error keys
    const errorKey = field === 'title' ? 'stepTitle' : field === 'textContent' ? 'stepContent' : field;
    
    if (formErrors[errorKey]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-3">Step Content Configuration Builder</h3>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <input 
            type="text" 
            placeholder="Step Title Name..." 
            value={currentFlowStep.title} 
            onChange={(e) => handleFieldChange('title', e.target.value)} 
            className={`w-full p-2.5 bg-gray-50 border ${formErrors.stepTitle ? 'border-red-500' : 'border-gray-200'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`} 
          />
          {formErrors.stepTitle && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.stepTitle}</p>}
        </div>
      </div>

      <div className="p-4 bg-gray-50 border border-gray-200 border-dashed rounded-xl space-y-6">
        
        {/* 1. Instructional Materials */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">1. Instructional Summary</h4>
          <div>
            <RichTextEditor 
              placeholder="Type instructions or summary here..." 
              value={currentFlowStep.textContent} 
              onChange={(content) => handleFieldChange('textContent', content)} 
              className={`min-h-[120px] ${formErrors.stepContent ? 'border-red-500' : ''}`}
            />
            {formErrors.stepContent && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.stepContent}</p>}
          </div>
        </div>

        {/* 2. Media/Document Upload */}
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">2. Media & Document Upload</h4>
          <div className="flex flex-col gap-2 bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Upload Reference File (Video, PDF, DOCX - max 50MB)</span>
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
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-colors" 
            />
            {writtenMaterialFile && (
              <div className="mt-3">
                <p className="text-xs text-emerald-600 font-semibold mb-2">Staged File: {writtenMaterialFile.name}</p>
                {writtenMaterialFile.type.startsWith("video/") && (
                  <video 
                    controls 
                    preload="metadata" 
                    className="w-full max-h-64 object-cover rounded-lg border border-gray-200 mt-2"
                    src={URL.createObjectURL(writtenMaterialFile)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. Micro-Quiz Assessment */}
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">3. Formative Micro-Assessment</h4>
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
        onClick={addStepToFlow} 
        className="w-full py-3 bg-white hover:bg-gray-50 border border-gray-200 text-sm font-bold rounded-xl text-gray-700 shadow-sm transition-colors"
      >
        + Save Micro-Learning Step
      </button>
    </div>
  );
}
