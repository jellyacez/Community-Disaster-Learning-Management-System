import React, { useState } from "react";
import toast from "react-hot-toast";
import PriorityActionEditor from "./step-components/PriorityActionEditor";
import HazardIdentificationEditor from "./step-components/HazardIdentificationEditor";
import ActionSequenceEditor from "./step-components/ActionSequenceEditor";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";

export default function AssessmentEditor({ 
  currentFlowStep, 
  setCurrentFlowStep, 
  currentQuizQuestion, 
  setCurrentQuizQuestion, 
  currentSituationalData,
  setCurrentSituationalData,
  addQuizQuestionToStep, 
  situationalImage, 
  setSituationalImage,
  formErrors = {},
  setFormErrors
}) {
  const [questionToDelete, setQuestionToDelete] = useState(null);

  const handleStepChange = (field, value) => {
    setCurrentFlowStep({ ...currentFlowStep, [field]: value });
    if (formErrors[field] || formErrors.stepScenario) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        if (field === 'situationalScenario') delete newErrors.stepScenario;
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleQuestionChange = (field, value) => {
    setCurrentQuizQuestion({ ...currentQuizQuestion, [field]: value });
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleOptionChange = (oIdx, field, value) => {
    const updated = [...currentQuizQuestion.options];
    updated[oIdx] = { ...updated[oIdx], [field]: value };
    setCurrentQuizQuestion({ ...currentQuizQuestion, options: updated });
    if (formErrors.options) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.options;
        return newErrors;
      });
    }
  };

  const handleEditQuestion = (index) => {
    const questionToEdit = currentFlowStep.quizQuestions[index];
    setCurrentQuizQuestion(questionToEdit);
    const updatedQuestions = currentFlowStep.quizQuestions.filter((_, i) => i !== index);
    setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updatedQuestions });
  };

  const handleDeleteQuestion = (index) => {
    setQuestionToDelete(index);
  };

  const confirmDeleteQuestion = () => {
    if (questionToDelete !== null) {
      const updatedQuestions = currentFlowStep.quizQuestions.filter((_, i) => i !== questionToDelete);
      setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updatedQuestions });
      setQuestionToDelete(null);
    }
  };

  return (
    <div className="space-y-4 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 3. Formative Assessment Checkbox */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Assessment Configuration</h4>
        <div className="flex items-center space-x-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
          <input
            type="checkbox"
            id="is_final_assessment"
            checked={currentFlowStep.is_final_assessment || false}
            onChange={(e) => handleStepChange("is_final_assessment", e.target.checked)}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-red-300 rounded cursor-pointer"
          />
          <label htmlFor="is_final_assessment" className="text-xs font-black text-red-800 cursor-pointer select-none">
            Mark as Final Assessment
          </label>
        </div>
      </div>
      
      {/* Quiz Editor */}
      {currentFlowStep.builderStepType === "quiz" && (
        <div className="space-y-4 pt-2">
          {formErrors.stepQuiz && <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded border border-red-100">{formErrors.stepQuiz}</p>}
          <div>
            <input 
              type="text" 
              placeholder="Write quiz question text block..." 
              value={currentQuizQuestion.questionText} 
              onChange={(e) => handleQuestionChange('questionText', e.target.value)} 
              className={`w-full p-3.5 bg-white border ${formErrors.questionText ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-300'} rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 shadow-sm transition-all`} 
            />
            {formErrors.questionText && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.questionText}</p>}
          </div>
          <div className="grid grid-cols-1 gap-3">
            {currentQuizQuestion.options.map((opt, oIdx) => (
              <div key={oIdx} className={`p-4 rounded-xl text-sm transition-all ${
                  currentQuizQuestion.correctAnswerIndex === oIdx 
                    ? "border-2 border-emerald-500 bg-emerald-50 shadow-sm" 
                    : formErrors.options ? "border border-red-500 bg-white" : "border border-slate-200 bg-slate-50 hover:bg-slate-100/50"
                }`}>
                <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${
                  currentQuizQuestion.correctAnswerIndex === oIdx ? "text-emerald-700" : "text-slate-500"
                }`}>
                 Choice Answer Option {oIdx + 1} {currentQuizQuestion.correctAnswerIndex === oIdx && "(Correct Answer)"}
                </label>

                <input
                  type="text"
                  placeholder="Enter answer choice"
                  value={opt.text}
                  onChange={(e) => handleOptionChange(oIdx, 'text', e.target.value)}
                  className={`w-full p-2.5 bg-white border ${currentQuizQuestion.correctAnswerIndex === oIdx ? 'border-emerald-300' : 'border-slate-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium placeholder:text-slate-400 mb-2 transition-colors`}
                />
                <textarea 
                  rows="2"
                  placeholder={`Rationale / Formative Feedback (Shown if selected)`}
                  value={opt.rationale}
                  onChange={(e) => handleOptionChange(oIdx, 'rationale', e.target.value)}
                  className={`w-full p-2.5 bg-white border ${currentQuizQuestion.correctAnswerIndex === oIdx ? 'border-emerald-200' : 'border-slate-200'} rounded-lg focus:outline-none text-xs resize-none placeholder:text-slate-400`}
                />
              </div>
            ))}
            {formErrors.options && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.options}</p>}
          </div>
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
            <select 
              value={currentQuizQuestion.correctAnswerIndex} 
              onChange={(e) => handleQuestionChange('correctAnswerIndex', parseInt(e.target.value))} 
              className="p-2 border border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value={0}>Option 1 is correct</option>
              <option value={1}>Option 2 is correct</option>
              <option value={2}>Option 3 is correct</option>
              <option value={3}>Option 4 is correct</option>
            </select>
            <button 
              type="button" 
              onClick={addQuizQuestionToStep} 
              className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-white shadow-sm hover:bg-slate-900 transition-colors uppercase tracking-wide"
            >
              + Commit Question
            </button>
          </div>
          
          {/* Render saved questions for this step */}
          {currentFlowStep.quizQuestions.length > 0 && (
            <div className="mt-4 bg-white p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-sm">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Committed Questions ({currentFlowStep.quizQuestions.length})</p>
              <div className="space-y-2">
                {currentFlowStep.quizQuestions.map((q, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-emerald-100 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-slate-700 flex-1 break-words">{idx + 1}. {q.questionText}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        type="button"
                        onClick={() => handleEditQuestion(idx)}
                        className="px-2.5 py-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded uppercase tracking-wide transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteQuestion(idx)}
                        className="px-2.5 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded uppercase tracking-wide transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Situational Editor */}
      {currentFlowStep.builderStepType === "situational" && (
        <div className="space-y-4 pt-2">
          <div>
            <textarea 
              rows="4" 
              placeholder="Describe crisis scenario circumstances..." 
              value={currentFlowStep.situationalScenario} 
              onChange={(e) => handleStepChange('situationalScenario', e.target.value)} 
              className={`w-full p-3 bg-white border ${formErrors.stepScenario ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-300'} rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 shadow-sm resize-none transition-all`} 
            />
            {formErrors.stepScenario && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.stepScenario}</p>}
          </div>
          <div className="flex flex-col gap-2.5 bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Upload Attachment Reference Picture</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => {
                const targetFile = e.target.files[0];
                if(targetFile) {
                  setSituationalImage(targetFile);
                  toast.success(`Asset assigned successfully: ${targetFile.name}`);
                }
              }}
              className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-bold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer transition-colors" 
            />
            {situationalImage && (
              <p className="text-xs text-emerald-600 font-bold mt-1 bg-emerald-50 p-2 rounded border border-emerald-100">
                Current Asset: {situationalImage.name || 'External URL Reference'}
              </p>
            )}
          </div>
          
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
              Scenario Interaction Type
            </label>
            <select 
              value={currentSituationalData?.interactionType || "priority_action"} 
              onChange={(e) => setCurrentSituationalData({ ...currentSituationalData, interactionType: e.target.value })} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all cursor-pointer"
            >
              <option value="priority_action">Option A: Priority Action (1 Correct Action)</option>
              <option value="hazard_identification">Option B: Hazard Identification (Multiple Select)</option>
              <option value="action_sequence">Option C: Action Sequence (Ordering)</option>
            </select>
          </div>

          {currentSituationalData?.interactionType === "priority_action" && (
            <PriorityActionEditor 
              currentSituationalData={currentSituationalData}
              setCurrentSituationalData={setCurrentSituationalData}
              formErrors={formErrors}
            />
          )}

          {currentSituationalData?.interactionType === "hazard_identification" && (
            <HazardIdentificationEditor 
              currentSituationalData={currentSituationalData}
              setCurrentSituationalData={setCurrentSituationalData}
              formErrors={formErrors}
            />
          )}

          {currentSituationalData?.interactionType === "action_sequence" && (
            <ActionSequenceEditor 
              currentSituationalData={currentSituationalData}
              setCurrentSituationalData={setCurrentSituationalData}
              formErrors={formErrors}
            />
          )}
        </div>
      )}
      <ConfirmationModal
        isOpen={questionToDelete !== null}
        title="Delete Quiz Question"
        message="Are you sure you want to remove this question from the quiz? This action cannot be undone."
        confirmText="Delete Question"
        onConfirm={confirmDeleteQuestion}
        onCancel={() => setQuestionToDelete(null)}
      />
    </div>
  );
}
