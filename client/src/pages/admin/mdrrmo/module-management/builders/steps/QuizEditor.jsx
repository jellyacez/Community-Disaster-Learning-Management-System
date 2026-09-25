import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import toast from "react-hot-toast";
import ConfirmationModal from "../../../../../../components/ui/modals/ConfirmationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Task01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Delete01Icon,
} from "@hugeicons/core-free-icons";
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
        if (formErrors.questionText)
          anchorIds.push("quiz-question-text-anchor");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formErrors._scrollTrigger]);

  const handleOptionChange = (index, field, value) => {
    const updated = [...currentQuizQuestion.options];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentQuizQuestion({ ...currentQuizQuestion, options: updated });

    if (formErrors.options) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.options;
        return next;
      });
    }
  };

  const handleCorrectAnswerChange = (index) => {
    setCurrentQuizQuestion({
      ...currentQuizQuestion,
      correctAnswerIndex: index,
    });
  };

  const removeQuestionFromStep = (index) => {
    const updated = [...currentFlowStep.quizQuestions];
    const removedQuestion = updated[index];
    updated.splice(index, 1);

    setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updated });
    toast.success(
      `Question "${removedQuestion?.questionText || index + 1}" removed successfully`
    );
    setQuestionToDelete(null);
  };

  const moveQuestion = (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentFlowStep.quizQuestions.length)
      return;

    const updated = [...currentFlowStep.quizQuestions];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updated });
  };

  const handleQuestionTypeChange = (value) => {
    setCurrentQuizQuestion({
      ...currentQuizQuestion,
      questionType: value,
    });
  };

  const handlePlannedQuestionCountChange = (value) => {
    const parsed = parseInt(value, 10);

    setCurrentFlowStep({
      ...currentFlowStep,
      plannedQuestionCount: isNaN(parsed) || parsed < 1 ? 1 : parsed,
    });
  };

  const plannedQuestionCount =
    currentFlowStep.plannedQuestionCount && currentFlowStep.plannedQuestionCount > 0
      ? currentFlowStep.plannedQuestionCount
      : 1;

  const currentQuestionType =
    currentQuizQuestion.questionType || "multiple_choice";

  return (
    <div className="space-y-4 pt-2">
      {/* 1. Assessment Config */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button
          type="button"
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors text-left"
        >
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            1. Assessment Configuration
          </span>
          <span className="text-slate-400 dark:text-slate-500 font-bold">
            {isConfigOpen ? "−" : "+"}
          </span>
        </button>

        {isConfigOpen && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50 dark:bg-slate-900/40">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900/50">
                <input
                  type="checkbox"
                  id="is_final_assessment"
                  checked={currentFlowStep.is_final_assessment || false}
                  onChange={(e) =>
                    setCurrentFlowStep({
                      ...currentFlowStep,
                      is_final_assessment: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-red-300 dark:border-red-700 rounded cursor-pointer"
                />
                <label
                  htmlFor="is_final_assessment"
                  className="text-xs font-black text-red-800 dark:text-red-300 cursor-pointer select-none"
                >
                  Mark as Final Assessment
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Question Type
              </label>
              <select
                value={currentQuestionType}
                onChange={(e) => handleQuestionTypeChange(e.target.value)}
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 transition-all"
              >
                <option value="multiple_choice">Multiple Choice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Planned Question Count
              </label>
              <input
                type="number"
                min="1"
                value={plannedQuestionCount}
                onChange={(e) => handlePlannedQuestionCountChange(e.target.value)}
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 transition-all"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Questions Added:{" "}
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {currentFlowStep.quizQuestions?.length || 0}
                </span>{" "}
                / {plannedQuestionCount}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Question Prompt */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button
          type="button"
          onClick={() => setIsQuestionOpen(!isQuestionOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors text-left"
        >
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            2. Question Details
          </span>
          <span className="text-slate-400 dark:text-slate-500 font-bold">
            {isQuestionOpen ? "−" : "+"}
          </span>
        </button>

        {isQuestionOpen && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50 dark:bg-slate-900/40">
            <div id="quiz-question-text-anchor">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Question Prompt <span className="text-red-500">*</span>
              </label>
              <textarea
                rows="2"
                value={currentQuizQuestion.questionText}
                onChange={(e) => {
                  setCurrentQuizQuestion({
                    ...currentQuizQuestion,
                    questionText: e.target.value,
                  });
                  if (formErrors.questionText) {
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.questionText;
                      return next;
                    });
                  }
                }}
                placeholder="e.g., What is the immediate priority when structural damage is observed during a drill?"
                className={`w-full p-3 bg-white dark:bg-slate-800 border ${
                  formErrors.questionText
                    ? "border-red-500 ring-2 ring-red-500/10"
                    : "border-slate-300 dark:border-slate-700"
                } rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500`}
              />
              {formErrors.questionText && (
                <p className="text-red-500 text-xs mt-1.5 font-bold">
                  {formErrors.questionText}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Multiple Choice Options */}
      {currentQuestionType === "multiple_choice" && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button
            type="button"
            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              3. Answer Options & Rationales
            </span>
            <span className="text-slate-400 dark:text-slate-500 font-bold">
              {isOptionsOpen ? "−" : "+"}
            </span>
          </button>

          {isOptionsOpen && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-900/40">
              <div className="grid grid-cols-1 gap-3">
                {currentQuizQuestion.options.map((opt, oIdx) => (
                  <div
                    key={oIdx}
                    id={`quiz-option-${oIdx}-anchor`}
                    className={`p-3.5 rounded-xl text-sm transition-all border ${
                      currentQuizQuestion.correctAnswerIndex === oIdx
                        ? "bg-red-50/50 dark:bg-red-950/30 border-2 border-red-500 shadow-sm"
                        : formErrors.options && !opt.text.trim()
                          ? "bg-white dark:bg-slate-800 border-2 border-red-400"
                          : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
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
                        <span
                          className={`text-xs font-bold uppercase tracking-wide ${
                            currentQuizQuestion.correctAnswerIndex === oIdx
                              ? "text-red-700 dark:text-red-400"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          Option {String.fromCharCode(65 + oIdx)}{" "}
                          {currentQuizQuestion.correctAnswerIndex === oIdx &&
                            "(Correct Answer)"}
                        </span>
                      </label>
                    </div>

                    <input
                      type="text"
                      placeholder={`Choice text for option ${String.fromCharCode(
                        65 + oIdx
                      )}...`}
                      value={opt.text}
                      onChange={(e) =>
                        handleOptionChange(oIdx, "text", e.target.value)
                      }
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 mb-2 transition-colors"
                    />

                    <textarea
                      rows="2"
                      placeholder="Explanation/Rationale for this answer option..."
                      value={opt.rationale}
                      onChange={(e) =>
                        handleOptionChange(oIdx, "rationale", e.target.value)
                      }
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                    />
                  </div>
                ))}
              </div>

              {formErrors.options && (
                <p className="text-red-500 text-xs mt-1.5 font-bold">
                  {formErrors.options}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Question Staging Actions */}
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
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Staged Questions ({currentFlowStep.quizQuestions.length})
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {currentFlowStep.quizQuestions.map((q, idx) => (
              <div
                key={idx}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-bold text-red-600 shrink-0">
                    Q{idx + 1}.
                  </span>
                  <p className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {q.questionText}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveQuestion(idx, "up")}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 disabled:opacity-30 transition-colors"
                  >
                    <HugeiconsIcon icon={ArrowUp01Icon} className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === currentFlowStep.quizQuestions.length - 1}
                    onClick={() => moveQuestion(idx, "down")}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 disabled:opacity-30 transition-colors"
                  >
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      className="w-3.5 h-3.5"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setQuestionToDelete({
                        index: idx,
                        title: q.questionText,
                      })
                    }
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded transition-colors ml-1"
                  >
                    <HugeiconsIcon icon={Delete01Icon} className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Modal */}
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