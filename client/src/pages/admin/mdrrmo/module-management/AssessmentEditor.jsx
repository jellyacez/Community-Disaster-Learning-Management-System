import React from "react";

export default function AssessmentEditor({ 
  currentFlowStep, 
  setCurrentFlowStep, 
  currentQuizQuestion, 
  setCurrentQuizQuestion, 
  addQuizQuestionToStep, 
  situationalImage, 
  setSituationalImage 
}) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-bold text-gray-700">Verification Type Selection:</span>
        <select 
          value={currentFlowStep.assessmentType} 
          onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, assessmentType: e.target.value })} 
          className="p-1.5 border border-gray-200 rounded bg-white focus:outline-none"
        >
          <option value="quiz">Multiple Choice Quiz</option>
          <option value="situational">Situational Scenario Case</option>
        </select>
      </div>
      
      {/* Quiz Editor */}
      {currentFlowStep.assessmentType === "quiz" && (
        <div className="space-y-3 border-t border-gray-200 pt-3">
          <input 
            type="text" 
            placeholder="Write quiz question text block..." 
            value={currentQuizQuestion.questionText} 
            onChange={(e) => setCurrentQuizQuestion({ ...currentQuizQuestion, questionText: e.target.value })} 
            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm" 
          />
          <div className="grid grid-cols-1 gap-2">
            {currentQuizQuestion.options.map((opt, oIdx) => (
              <input 
                key={oIdx} 
                type="text" 
                placeholder={`Choice Answer Option ${oIdx + 1}`} 
                value={opt} 
                onChange={(e) => {
                  const updated = [...currentQuizQuestion.options];
                  updated[oIdx] = e.target.value;
                  setCurrentQuizQuestion({ ...currentQuizQuestion, options: updated });
                }} 
                className={`p-2.5 rounded-xl text-sm focus:outline-none shadow-sm transition-colors ${
                  currentQuizQuestion.correctAnswerIndex === oIdx 
                    ? "border-2 border-emerald-500 bg-emerald-50" 
                    : "border border-slate-200 bg-white"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-4 pt-2">
            <select 
              value={currentQuizQuestion.correctAnswerIndex} 
              onChange={(e) => setCurrentQuizQuestion({ ...currentQuizQuestion, correctAnswerIndex: parseInt(e.target.value) })} 
              className="p-1.5 border border-gray-200 rounded bg-white text-xs focus:outline-none"
            >
              <option value={0}>Option 1 is correct</option>
              <option value={1}>Option 2 is correct</option>
              <option value={2}>Option 3 is correct</option>
              <option value={3}>Option 4 is correct</option>
            </select>
            <button 
              type="button" 
              onClick={addQuizQuestionToStep} 
              className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
            >
              + Save Question
            </button>
          </div>
          
          {/* Render saved questions for this step */}
          {currentFlowStep.quizQuestions.length > 0 && (
            <div className="mt-3 bg-white p-3 rounded-xl border border-emerald-100 bg-emerald-50/30">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Saved Questions ({currentFlowStep.quizQuestions.length})</p>
              <div className="space-y-1">
                {currentFlowStep.quizQuestions.map((q, idx) => (
                  <p key={idx} className="text-xs text-gray-700 truncate">• {q.questionText}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Situational Editor */}
      {currentFlowStep.assessmentType === "situational" && (
        <div className="space-y-3 border-t border-gray-200 pt-3">
          <textarea 
            rows="3" 
            placeholder="Describe crisis scenario circumstances..." 
            value={currentFlowStep.situationalScenario} 
            onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, situationalScenario: e.target.value })} 
            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm resize-none" 
          />
          <div className="flex flex-col gap-2 bg-white p-3 border border-gray-200 rounded-xl shadow-sm">
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">Upload Attachment Reference Picture</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => {
                const targetFile = e.target.files[0];
                if(targetFile) {
                  setSituationalImage(targetFile);
                  alert(`Asset assigned successfully: ${targetFile.name}`);
                }
              }}
              className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-colors" 
            />
            {situationalImage && <p className="text-[10px] text-emerald-600 font-mono font-medium mt-1">Staged Image: {situationalImage.name}</p>}
          </div>
          <textarea 
            rows="2" 
            placeholder="Officer check rubric grading guides..." 
            value={currentFlowStep.situationalGuide} 
            onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, situationalGuide: e.target.value })} 
            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm resize-none" 
          />
        </div>
      )}
    </div>
  );
}
