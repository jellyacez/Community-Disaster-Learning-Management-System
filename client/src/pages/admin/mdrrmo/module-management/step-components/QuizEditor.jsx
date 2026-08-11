import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import ConfirmationModal from "../../../../../components/ui/modals/ConfirmationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import { Task01Icon, ArrowUp01Icon, ArrowDown01Icon, Delete01Icon } from "@hugeicons/core-free-icons";

import { scrollToFirstError } from "../../../../../utils/scrollUtils";

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
        
        // Wait for next tick to ensure DOM is painted before we measure rects
        setTimeout(() => {
          const activeErrorIds = [];
          if (formErrors.questionText) activeErrorIds.push("quiz-question-anchor");
          
          if (formErrors.options) {
            currentQuizQuestion.options.forEach((opt, idx) => {
              if (!opt.text.trim() || !opt.rationale.trim()) {
                activeErrorIds.push(`quiz-option-${idx}-anchor`);
              }
            });
          }
          
          scrollToFirstError("step-builder-scroll-container", activeErrorIds);
        }, 50);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [formErrors._scrollTrigger]);

  const handleQuestionChange = (field, value) => {
    setCurrentQuizQuestion({ ...currentQuizQuestion, [field]: value });
    if (formErrors[field]) {
      setFormErrors((prev) => {
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
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.options;
        return newErrors;
      });
    }
  };

  const handleEditQuestion = (index) => {
    const questionToEdit = currentFlowStep.quizQuestions[index];
    setCurrentQuizQuestion(questionToEdit);
    const updatedQuestions = currentFlowStep.quizQuestions.filter(
      (_, i) => i !== index,
    );
    setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updatedQuestions });
  };

  const moveQuizQuestion = (index, direction) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === currentFlowStep.quizQuestions.length - 1) return;
    
    const newQuestions = [...currentFlowStep.quizQuestions];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[swapIndex];
    newQuestions[swapIndex] = temp;
    
    setCurrentFlowStep({ ...currentFlowStep, quizQuestions: newQuestions });
  };

  const handleDeleteQuestion = (index) => {
    setQuestionToDelete(index);
  };

  const confirmDeleteQuestion = () => {
    if (questionToDelete !== null) {
      const updatedQuestions = currentFlowStep.quizQuestions.filter(
        (_, i) => i !== questionToDelete,
      );
      setCurrentFlowStep({
        ...currentFlowStep,
        quizQuestions: updatedQuestions,
      });
      setQuestionToDelete(null);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {formErrors.stepQuiz && (
        <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded border border-red-100">
          {formErrors.stepQuiz}
        </p>
      )}
      
      {/* Question Text Accordion */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
        <button 
          type="button" 
          onClick={() => setIsQuestionOpen(!isQuestionOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">1. Question Text</span>
          <span className="text-slate-400 font-bold">{isQuestionOpen ? '−' : '+'}</span>
        </button>
        {isQuestionOpen && (
          <div className="p-4 border-t border-slate-200">
            <input
              id="quiz-question-anchor"
              type="text"
              placeholder="Write quiz question text block..."
              value={currentQuizQuestion.questionText}
              onChange={(e) => handleQuestionChange("questionText", e.target.value)}
              className={`w-full p-3.5 bg-white border ${formErrors.questionText ? "border-red-500 ring-2 ring-red-500/10" : "border-slate-300"} rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 shadow-sm transition-all`}
            />
            {formErrors.questionText && (
              <p className="text-red-500 text-xs mt-1.5 font-bold">
                {formErrors.questionText}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Choice Options Accordion */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
        <button 
          type="button" 
          onClick={() => setIsOptionsOpen(!isOptionsOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">2. Choice Options</span>
          <span className="text-slate-400 font-bold">{isOptionsOpen ? '−' : '+'}</span>
        </button>
        {isOptionsOpen && (
          <div className="p-4 border-t border-slate-200" id="quiz-options-anchor">
            <div className="grid grid-cols-1 gap-3">
              {currentQuizQuestion.options.map((opt, oIdx) => (
                <div
                  key={oIdx}
                  id={`quiz-option-${oIdx}-anchor`}
                  className={`p-4 rounded-xl text-sm transition-all ${
                    currentQuizQuestion.correctAnswerIndex === oIdx
                      ? "border-2 border-emerald-500 bg-emerald-50 shadow-sm"
                      : formErrors.options
                        ? "border border-red-500 bg-white"
                        : "border border-slate-200 bg-slate-50 hover:bg-slate-100/50"
                  }`}
                >
                  <label
                    className={`flex items-center gap-2 cursor-pointer block text-xs font-bold uppercase tracking-wide mb-2 ${
                      currentQuizQuestion.correctAnswerIndex === oIdx
                        ? "text-emerald-700"
                        : "text-slate-500"
                    }`}
                  >
                    <input 
                      type="radio" 
                      name={`correctAnswer-${currentQuizQuestion?.id || 'new'}`}
                      checked={currentQuizQuestion.correctAnswerIndex === oIdx} 
                      onChange={() => handleQuestionChange("correctAnswerIndex", oIdx)} 
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    Choice Answer Option {oIdx + 1}{" "}
                    {currentQuizQuestion.correctAnswerIndex === oIdx &&
                      "(Correct Answer)"}
                  </label>

                  <input
                    type="text"
                    placeholder="Enter answer choice"
                    value={opt.text}
                    onChange={(e) => handleOptionChange(oIdx, "text", e.target.value)}
                    className={`w-full p-2.5 bg-white border ${currentQuizQuestion.correctAnswerIndex === oIdx ? "border-emerald-300" : "border-slate-300"} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium placeholder:text-slate-400 mb-2 transition-colors`}
                  />
                  <textarea
                    rows="2"
                    placeholder={`Rationale / Formative Feedback (Shown if selected)`}
                    value={opt.rationale}
                    onChange={(e) =>
                      handleOptionChange(oIdx, "rationale", e.target.value)
                    }
                    className={`w-full p-2.5 bg-white border ${currentQuizQuestion.correctAnswerIndex === oIdx ? "border-emerald-200" : "border-slate-200"} rounded-lg focus:outline-none text-xs resize-none placeholder:text-slate-400`}
                  />
                </div>
              ))}
              {formErrors.options && (
                <p className="text-red-500 text-xs mt-1 font-medium">
                  {formErrors.options}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assessment Config Accordion */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
        <button 
          type="button" 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">3. Assessment Config</span>
          <span className="text-slate-400 font-bold">{isConfigOpen ? '−' : '+'}</span>
        </button>
        {isConfigOpen && (
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={addQuizQuestionToStep}
                className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-white shadow-sm hover:bg-slate-900 transition-colors uppercase tracking-wide"
              >
                + Commit Question
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Render saved questions for this step */}
      {currentFlowStep.quizQuestions.length > 0 && (
        <div className="mt-4 bg-white p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-sm">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">
            Committed Questions ({currentFlowStep.quizQuestions.length})
          </p>
          <div className="space-y-2">
            {currentFlowStep.quizQuestions.map((q, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-emerald-100 rounded-lg shadow-sm group"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="flex shrink-0 items-center justify-center w-6 h-6 rounded bg-emerald-50 text-emerald-600">
                    <HugeiconsIcon icon={Task01Icon} className="w-3.5 h-3.5" />
                  </span>
                  <p className="text-xs font-semibold text-slate-700 truncate" title={`${idx + 1}. ${q.questionText}`}>
                    {idx + 1}. {q.questionText}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-0.5 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      type="button" 
                      onClick={() => moveQuizQuestion(idx, "up")} 
                      disabled={idx === 0} 
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                      title="Move Up"
                    >
                        <HugeiconsIcon icon={ArrowUp01Icon} className="w-4 h-4" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => moveQuizQuestion(idx, "down")} 
                      disabled={idx === currentFlowStep.quizQuestions.length - 1} 
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                      title="Move Down"
                    >
                        <HugeiconsIcon icon={ArrowDown01Icon} className="w-4 h-4" />
                    </button>
                  </div>
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
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete Question"
                  >
                    <HugeiconsIcon icon={Delete01Icon} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={questionToDelete !== null}
        title="Delete Quiz Question"
        description="Are you sure you want to remove this question from the quiz? This action cannot be undone."
        confirmText="Delete Question"
        type="danger"
        onConfirm={confirmDeleteQuestion}
        onClose={() => setQuestionToDelete(null)}
      />
    </div>
  );
}
