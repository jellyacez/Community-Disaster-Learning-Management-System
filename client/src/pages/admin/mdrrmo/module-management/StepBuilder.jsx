import React from "react";
import AssessmentEditor from "./AssessmentEditor";

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
  addStepToFlow 
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
      <h3 className="text-xs font-bold uppercase text-gray-400 border-b border-gray-100 pb-2 font-mono">Step Content Configuration Builder</h3>
      <div className="grid grid-cols-2 gap-4">
        <input 
          type="text" 
          placeholder="Step Title Name..." 
          value={currentFlowStep.title} 
          onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, title: e.target.value })} 
          className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
        />
        <select 
          value={currentFlowStep.type} 
          onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, type: e.target.value })} 
          className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
        >
          <option value="text">Instructional Materials</option>
          <option value="assessment">Assessment Verification</option>
        </select>
      </div>

      <div className="p-4 bg-gray-50 border border-gray-200 border-dashed rounded-xl space-y-4">
        
        {/* Instructional Materials Form */}
        {currentFlowStep.type === "text" && (
          <div className="space-y-3">
            <textarea 
              rows="3" 
              placeholder="Type instructions here..." 
              value={currentFlowStep.textContent} 
              onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, textContent: e.target.value })} 
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none shadow-sm" 
            />
            <div className="flex flex-col gap-2 bg-white p-3 border border-gray-200 rounded-xl shadow-sm">
              <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">Upload Reference File (DOCX / Audio / Video Material)</span>
              <input 
                type="file" 
                accept=".docx, audio/*, video/*" 
                onChange={(e) => {
                  const targetFile = e.target.files[0];
                  if (targetFile) {
                    setWrittenMaterialFile(targetFile);
                    alert(`Instructional attachment staged: ${targetFile.name}`);
                  }
                }}
                className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-colors" 
              />
              {writtenMaterialFile && <p className="text-[10px] text-emerald-600 font-mono font-medium mt-1">Staged Attachment: {writtenMaterialFile.name}</p>}
            </div>
          </div>
        )}

        {/* Assessment Verification Form */}
        {currentFlowStep.type === "assessment" && (
          <AssessmentEditor 
            currentFlowStep={currentFlowStep}
            setCurrentFlowStep={setCurrentFlowStep}
            currentQuizQuestion={currentQuizQuestion}
            setCurrentQuizQuestion={setCurrentQuizQuestion}
            addQuizQuestionToStep={addQuizQuestionToStep}
            situationalImage={situationalImage}
            setSituationalImage={setSituationalImage}
          />
        )}
      </div>
      <button 
        type="button" 
        onClick={addStepToFlow} 
        className="w-full py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-sm font-bold rounded-xl text-gray-700 shadow-sm transition-colors"
      >
        + Save Content Step Element
      </button>
    </div>
  );
}
