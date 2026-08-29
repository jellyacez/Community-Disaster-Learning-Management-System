import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import ConfirmationModal from "../../../../../../components/ui/modals/ConfirmationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import { Task01Icon, ArrowUp01Icon, ArrowDown01Icon, Delete01Icon } from "@hugeicons/core-free-icons";

import { scrollToFirstError } from "../../../../../../utils/scrollUtils";

export default function QuizEditor({
  currentFlowStep,
  setCurrentFlowStep,
  currentQuizQuestion,
  setCurrentQuizQuestion,
  addQuizQuestionToStep,
  formErrors,
  setFormErrors,
}) {
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [isQuestionOpen, setIsQuestionOpen] = useState(true);
  const [isOptionsOpen, setIsOptionsOpen] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(true);

  useEffect(() => {
    if (formErrors.questionText || formErrors.options) {
      const timer = setTimeout(() => {
        flushSync(() => {
          if (formErrors.questionText) setIsQuestionOpen(true);
          if (formErrors.options) setIsOptionsOpen(true);
        });
        
        const anchorIds = [];
        if (formErrors.questionText) anchorIds.push("quiz-question-text-anchor");
        if (formErrors.options) {
          for (let i = 0; i < 4; i++) {
            anchorIds.push(`quiz-option-${i}-anchor`);
          }
        }
        
        setTimeout(() => {
          scrollToFirstError("step-builder-scroll-container", anchorIds);
        }, 50);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [formErrors._scrollTrigger]);

  const handleOptionChange = (index, field, value) => {
    const updated = [...currentQuizQuestion.options];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentQuizQuestion({ ...currentQuizQuestion, options: updated });
    
    if (formErrors.options) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next.options;
        return next;
      });
    }
  };

  const handleCorrectAnswerChange = (index) => {
    setCurrentQuizQuestion({ ...currentQuizQuestion, correctAnswerIndex: index });
  };

  const removeQuestionFromStep = (index) => {
    const updated = [...currentFlowStep.quizQuestions];
    updated.splice(index, 1);
    setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updated });
    setQuestionToDelete(null);
  };

  const moveQuestion = (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentFlowStep.quizQuestions.length) return;
    const updated = [...currentFlowStep.quizQuestions];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updated });
  };

  return (
    <div className="space-y-4 pt-2">
      {/* 1. Question Title/Prompt Accordion */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button 
          type="button" 
          onClick={() => setIsQuestionOpen(!isQuestionOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">1. Question Details</span>
          <span className="text-slate-400 font-bold">{isQuestionOpen ? '−' : '+'}</span>
        </button>
        {isQuestionOpen && (
          <div className="p-4 border-t border-slate-200 space-y-4 bg-slate-50">
            <div id="quiz-question-text-anchor">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Question Prompt <span className="text-red-500">*</span></label>
              <textarea 
                rows="2" 
                value={currentQuizQuestion.questionText} 
                onChange={(e) => {
                  setCurrentQuizQuestion({ ...currentQuizQuestion, questionText: e.target.value });
                  if (formErrors.questionText) {
                    setFormErrors(prev => {
                      const next = { ...prev };
                      delete next.questionText;
                      return next;
                    });
                  }
                }} 
                placeholder="e.g., What is the immediate priority when structural damage is observed during a drill?" 
                className={`w-full p-3 bg-white border ${formErrors.questionText ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-300'} rounded-xl text-sm font-medium focus:outline-none focus:border-red-500 transition-all placeholder:text-slate-400`} 
              />
              {formErrors.questionText && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.questionText}</p>}
            </div>
          </div>
        )}
      </div>

      {/* 2. Multiple Choice Options Accordion */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button 
          type="button" 
          onClick={() => setIsOptionsOpen(!isOptionsOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">2. Answer Options & Rationales</span>
          <span className="text-slate-400 font-bold">{isOptionsOpen ? '−' : '+'}</span>
        </button>
        {isOptionsOpen && (
          <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50">
            <div className="grid grid-cols-1 gap-3">
              {currentQuizQuestion.options.map((opt, oIdx) => (
                <div 
                  key={oIdx} 
                  id={`quiz-option-${oIdx}-anchor`}
                  className={`p-3.5 rounded-xl text-sm transition-all border ${
                    currentQuizQuestion.correctAnswerIndex === oIdx 
                      ? 'bg-red-50/50 border-2 border-red-500 shadow-sm' 
                      : formErrors.options && !opt.text.trim()
                        ? 'bg-white border-2 border-red-400' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="quiz-correct-choice" 
                        checked={currentQuizQuestion.correctAnswerIndex === oIdx} 
                        onChange={() => handleCorrectAnswerChange(oIdx)} 
                        className="w-4 h-4 text-red-600 focus:ring-red-500" 
                      />
                      <span className={`text-xs font-bold uppercase tracking-wide ${currentQuizQuestion.correctAnswerIndex === oIdx ? 'text-red-700' : 'text-slate-600'}`}>
                        Option {String.fromCharCode(65 + oIdx)} {currentQuizQuestion.correctAnswerIndex === oIdx && "(Correct Answer)"}
                      </span>
                    </label>
                  </div>

                  <input 
                    type="text" 
                    placeholder={`Choice text for option ${String.fromCharCode(65 + oIdx)}...`} 
                    value={opt.text} 
                    onChange={(e) => handleOptionChange(oIdx, 'text', e.target.value)} 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500 focus:bg-white text-sm font-medium placeholder:text-slate-400 mb-2 transition-colors" 
                  />

                  <textarea 
                    rows="2" 
                    placeholder="Explanation/Rationale for this answer option..." 
                    value={opt.rationale} 
                    onChange={(e) => handleOptionChange(oIdx, 'rationale', e.target.value)} 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:bg-white text-xs resize-none placeholder:text-slate-400 transition-colors" 
                  />
                </div>
              ))}
            </div>
            {formErrors.options && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.options}</p>}
          </div>
        )}
      </div>

      {/* 3. Question Staging Actions */}
      <div className="pt-2">
        <button 
          type="button" 
          onClick={addQuizQuestionToStep} 
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition-all uppercase tracking-wide flex items-center justify-center gap-2"
        >
          <HugeiconsIcon icon={Task01Icon} className="w-4 h-4" />
          + Stage Question into Step Pool
        </button>
      </div>

      {/* Staged Question Pool List */}
      {currentFlowStep.quizQuestions?.length > 0 && (
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Staged Questions ({currentFlowStep.quizQuestions.length})
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {currentFlowStep.quizQuestions.map((q, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-sm hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-bold text-red-600 shrink-0">Q{idx + 1}.</span>
                  <p className="truncate font-medium text-slate-800">{q.questionText}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    type="button" 
                    disabled={idx === 0} 
                    onClick={() => moveQuestion(idx, 'up')} 
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 transition-colors"
                  >
                    <HugeiconsIcon icon={ArrowUp01Icon} className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button" 
                    disabled={idx === currentFlowStep.quizQuestions.length - 1} 
                    onClick={() => moveQuestion(idx, 'down')} 
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 transition-colors"
                  >
                    <HugeiconsIcon icon={ArrowDown01Icon} className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setQuestionToDelete({ index: idx, title: q.questionText })} 
                    className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors ml-1"
                  >
                    <HugeiconsIcon icon={Delete01Icon} className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Delete Confirmation Modal */}
      {questionToDelete && (
        <ConfirmationModal 
          isOpen={true} 
          title="Remove Question from Step" 
          message={`Are you sure you want to discard Question ${questionToDelete.index + 1}: "${questionToDelete.title}"?`} 
          confirmLabel="Remove" 
          onConfirm={() => removeQuestionFromStep(questionToDelete.index)} 
          onCancel={() => setQuestionToDelete(null)} 
          type="danger" 
        />
      )}
    </div>
  );
}
