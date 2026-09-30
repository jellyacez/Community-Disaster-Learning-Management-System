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

const createEmptySlot = (questionType = "multiple_choice") => ({
  questionType,
  questionText: "",
  correctAnswerIndex: 0,
  options: [
    { text: "", rationale: "" },
    { text: "", rationale: "" },
    { text: "", rationale: "" },
    { text: "", rationale: "" },
  ],
});

const isQuestionFilled = (q) => {
  return !!(
    q &&
    typeof q.questionText === "string" &&
    q.questionText.trim().length > 0
  );
};

export default function QuizEditor({
  editingStepId,
  currentFlowStep,
  setCurrentFlowStep,
  currentQuizQuestion,
  setCurrentQuizQuestion,
  formErrors,
  setFormErrors,
}) {
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [reductionConfirmation, setReductionConfirmation] = useState(null);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [rawPlannedInput, setRawPlannedInput] = useState(null);
  const [isQuestionOpen, setIsQuestionOpen] = useState(true);
  const [isOptionsOpen, setIsOptionsOpen] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(true);

  const stepIdentity = editingStepId || currentFlowStep?.id || "draft";
  const slots = currentFlowStep.quizQuestions || [];
  const plannedQuestionCount =
    typeof currentFlowStep.plannedQuestionCount === "number" &&
    currentFlowStep.plannedQuestionCount >= 0
      ? currentFlowStep.plannedQuestionCount
      : 0;

  const filledCount = slots.filter(isQuestionFilled).length;
  const currentQuestionType =
    slots[activeSlotIndex]?.questionType ||
    currentQuizQuestion?.questionType ||
    "multiple_choice";

  const safeActiveSlotIndex =
    slots.length > 0 ? Math.min(activeSlotIndex, slots.length - 1) : 0;
  const activeSlot = slots[safeActiveSlotIndex] || null;

  // Sync initial mount / step switch: if plannedQuestionCount > 0 and slots are under targetSlots, populate
  useEffect(() => {
    const pCount = currentFlowStep.plannedQuestionCount ?? 0;
    const questions = currentFlowStep.quizQuestions || [];
    if (pCount <= 0) return;

    const filled = questions.filter(isQuestionFilled).length;
    const targetSlots =
      filled < 5
        ? Math.min(pCount, 5)
        : filled + Math.min(pCount - filled, 5);

    if (questions.length < targetSlots) {
      const needed = targetSlots - questions.length;
      const newSlots = Array.from({ length: needed }, () =>
        createEmptySlot(currentQuestionType)
      );
      setCurrentFlowStep((prev) => ({
        ...prev,
        quizQuestions: [...(prev.quizQuestions || []), ...newSlots],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdentity]);

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

  const applyPlannedCount = (newCount) => {
    const currentQuestions = currentFlowStep.quizQuestions || [];
    const filledQuestions = currentQuestions.filter(isQuestionFilled);
    const currentFilledCount = filledQuestions.length;

    if (newCount === 0) {
      if (currentFilledCount > 0) {
        setReductionConfirmation({
          newCount: 0,
          discardCount: currentFilledCount,
          previousCount: plannedQuestionCount,
        });
        return false;
      }
      setCurrentFlowStep({
        ...currentFlowStep,
        plannedQuestionCount: 0,
        quizQuestions: [],
      });
      setActiveSlotIndex(0);
      return true;
    }

    if (newCount < plannedQuestionCount) {
      // Decrease
      if (newCount < currentFilledCount) {
        // Edge Case 2: Reduce below filled count -> prompt confirmation
        const discardCount = currentFilledCount - newCount;
        setReductionConfirmation({
          newCount,
          discardCount,
          previousCount: plannedQuestionCount,
        });
        return false;
      }

      // Edge Case 2: Decrease >= filled count -> trim only empty trailing slots
      const targetSlots =
        currentFilledCount < 5
          ? Math.min(newCount, 5)
          : currentFilledCount + Math.min(newCount - currentFilledCount, 5);

      const emptySlotsNeeded = Math.max(0, targetSlots - currentFilledCount);
      const existingEmptySlots = currentQuestions.filter(
        (q) => !isQuestionFilled(q)
      );
      const trailingEmpty = existingEmptySlots.slice(0, emptySlotsNeeded);
      while (trailingEmpty.length < emptySlotsNeeded) {
        trailingEmpty.push(createEmptySlot(currentQuestionType));
      }

      const newQuizQuestions = [...filledQuestions, ...trailingEmpty];
      setCurrentFlowStep({
        ...currentFlowStep,
        plannedQuestionCount: newCount,
        quizQuestions: newQuizQuestions,
      });
      setActiveSlotIndex((prev) =>
        Math.min(prev, Math.max(0, newQuizQuestions.length - 1))
      );
      return true;
    }

    if (newCount > plannedQuestionCount) {
      // Edge Case 1: Increase -> tops up to Math.min(newCount, 5) slots without touching filled
      const targetSlots =
        currentFilledCount < 5
          ? Math.min(newCount, 5)
          : currentFilledCount + Math.min(newCount - currentFilledCount, 5);

      const emptySlotsNeeded = Math.max(0, targetSlots - currentFilledCount);
      const existingEmptySlots = currentQuestions.filter(
        (q) => !isQuestionFilled(q)
      );
      const trailingEmpty = existingEmptySlots.slice(0, emptySlotsNeeded);
      while (trailingEmpty.length < emptySlotsNeeded) {
        trailingEmpty.push(createEmptySlot(currentQuestionType));
      }

      const newQuizQuestions = [...filledQuestions, ...trailingEmpty];
      setCurrentFlowStep({
        ...currentFlowStep,
        plannedQuestionCount: newCount,
        quizQuestions: newQuizQuestions,
      });
      return true;
    }
    return true;
  };

  const handleInputChange = (value) => {
    // Only update raw input live while typing - never evaluate reduction or pop modals
    setRawPlannedInput(value);
  };

  const handleCommitPlannedCount = () => {
    if (rawPlannedInput === null) return;
    const trimmed = String(rawPlannedInput).trim();
    if (trimmed === "") {
      const applied = applyPlannedCount(0);
      if (applied) setRawPlannedInput(null);
      return;
    }
    const parsed = parseInt(trimmed, 10);
    // Edge Case 3: Enforce min="0" and clamp negative values to 0
    const clamped = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    const applied = applyPlannedCount(clamped);
    if (applied) setRawPlannedInput(null);
  };

  const confirmReduction = () => {
    if (!reductionConfirmation) return;
    const { newCount } = reductionConfirmation;
    const filledQuestions = (currentFlowStep.quizQuestions || []).filter(
      isQuestionFilled
    );
    const keptQuestions = filledQuestions.slice(0, newCount);

    setCurrentFlowStep({
      ...currentFlowStep,
      plannedQuestionCount: newCount,
      quizQuestions: keptQuestions,
    });
    setActiveSlotIndex((prev) => Math.min(prev, Math.max(0, newCount - 1)));
    setRawPlannedInput(null);
    setReductionConfirmation(null);
    toast.success(`Planned question count reduced to ${newCount}.`);
  };

  const cancelReduction = () => {
    if (!reductionConfirmation) return;
    setRawPlannedInput(null);
    setReductionConfirmation(null);
  };

  const handleActiveQuestionTextChange = (text) => {
    const updated = [...slots];
    if (!updated[safeActiveSlotIndex]) return;
    updated[safeActiveSlotIndex] = {
      ...updated[safeActiveSlotIndex],
      questionText: text,
    };
    setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updated });

    if (formErrors.questionText) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.questionText;
        return next;
      });
    }
  };

  const handleActiveOptionChange = (index, field, value) => {
    const updated = [...slots];
    if (!updated[safeActiveSlotIndex]) return;
    const currentOptions = updated[safeActiveSlotIndex].options || [
      { text: "", rationale: "" },
      { text: "", rationale: "" },
      { text: "", rationale: "" },
      { text: "", rationale: "" },
    ];
    const updatedOptions = [...currentOptions];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    updated[safeActiveSlotIndex] = {
      ...updated[safeActiveSlotIndex],
      options: updatedOptions,
    };
    setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updated });

    if (formErrors.options) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.options;
        return next;
      });
    }
  };

  const handleActiveCorrectAnswerChange = (index) => {
    const updated = [...slots];
    if (!updated[safeActiveSlotIndex]) return;
    updated[safeActiveSlotIndex] = {
      ...updated[safeActiveSlotIndex],
      correctAnswerIndex: index,
    };
    setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updated });
  };

  const handleQuestionTypeChange = (value) => {
    if (slots[safeActiveSlotIndex]) {
      const updated = [...slots];
      updated[safeActiveSlotIndex] = {
        ...updated[safeActiveSlotIndex],
        questionType: value,
      };
      setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updated });
    }
    if (setCurrentQuizQuestion) {
      setCurrentQuizQuestion((prev) => ({ ...prev, questionType: value }));
    }
  };

  const handleStageQuestion = () => {
    const currentQuestion = slots[safeActiveSlotIndex];
    if (!currentQuestion) return;

    const errors = {};
    if (!currentQuestion.questionText || !currentQuestion.questionText.trim()) {
      errors.questionText = "Question text is required to proceed.";
    }

    if (
      currentQuestion.questionType === "multiple_choice" &&
      (!currentQuestion.options ||
        currentQuestion.options.some((opt) => !opt.text || !opt.text.trim()))
    ) {
      errors.options = "All four multiple-choice options must be populated.";
    }

    if (
      currentQuestion.questionType === "multiple_choice" &&
      (!currentQuestion.options ||
        currentQuestion.options.some(
          (opt) => !opt.rationale || !opt.rationale.trim()
        ))
    ) {
      errors.options =
        "Rationale / Formative Feedback is required for all options to ensure pedagogical effectiveness.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors({ ...formErrors, ...errors, _scrollTrigger: Date.now() });
      toast.error("Please fill in all required question details and options.");
      return;
    }

    const wasFilled = isQuestionFilled(slots[safeActiveSlotIndex]);
    const updated = [...slots];
    updated[safeActiveSlotIndex] = {
      ...currentQuestion,
      questionText: currentQuestion.questionText.trim(),
    };

    const newFilledCount = updated.filter(isQuestionFilled).length;

    // Edge Case 4: Batch generation beyond 5
    // Once current batch of slots is completely filled, auto-generate the next batch of Math.min(remaining, 5) slots
    const allSlotsFilled = updated.every(isQuestionFilled);
    if (allSlotsFilled && newFilledCount < plannedQuestionCount) {
      const remaining = plannedQuestionCount - newFilledCount;
      const nextBatch = Math.min(remaining, 5);
      const newSlots = Array.from({ length: nextBatch }, () =>
        createEmptySlot(currentQuestionType)
      );
      const finalQuestions = [...updated, ...newSlots];
      setCurrentFlowStep({ ...currentFlowStep, quizQuestions: finalQuestions });
      setActiveSlotIndex(updated.length); // Advance to first newly generated slot
      toast.success(
        `Question staged! Generated next ${nextBatch} question slot${
          nextBatch > 1 ? "s" : ""
        }.`
      );
    } else {
      setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updated });
      if (wasFilled) {
        toast.success(`Question in Slot ${safeActiveSlotIndex + 1} updated!`);
      } else {
        toast.success(`Question staged into Slot ${safeActiveSlotIndex + 1}!`);
        // Advance to next empty slot if any
        const nextEmpty = updated.findIndex(
          (s, idx) => idx > safeActiveSlotIndex && !isQuestionFilled(s)
        );
        if (nextEmpty !== -1) {
          setActiveSlotIndex(nextEmpty);
        } else {
          const anyEmpty = updated.findIndex((s) => !isQuestionFilled(s));
          if (anyEmpty !== -1) {
            setActiveSlotIndex(anyEmpty);
          }
        }
      }
    }

    setFormErrors({});
  };

  const removeQuestionFromStep = (index) => {
    const currentQuestions = currentFlowStep.quizQuestions || [];
    const removedQuestion = currentQuestions[index];
    const updated = [...currentQuestions];
    updated.splice(index, 1);

    const filledAfterRemove = updated.filter(isQuestionFilled).length;
    let targetSlots = 0;
    if (plannedQuestionCount > 0) {
      if (filledAfterRemove < 5) {
        targetSlots = Math.min(plannedQuestionCount, 5);
      } else {
        targetSlots =
          filledAfterRemove +
          Math.min(plannedQuestionCount - filledAfterRemove, 5);
      }
    }

    while (updated.length < targetSlots) {
      updated.push(createEmptySlot(currentQuestionType));
    }

    setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updated });
    if (activeSlotIndex >= updated.length) {
      setActiveSlotIndex(Math.max(0, updated.length - 1));
    }
    toast.success(
      `Question "${removedQuestion?.questionText || index + 1}" removed successfully`
    );
    setQuestionToDelete(null);
  };

  const moveQuestion = (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slots.length) return;

    const updated = [...slots];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setCurrentFlowStep({ ...currentFlowStep, quizQuestions: updated });

    if (activeSlotIndex === index) {
      setActiveSlotIndex(targetIndex);
    } else if (activeSlotIndex === targetIndex) {
      setActiveSlotIndex(index);
    }
  };

  const isCurrentSlotFilled = activeSlot ? isQuestionFilled(activeSlot) : false;
  const isCapped = !isCurrentSlotFilled && filledCount >= plannedQuestionCount;

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
                min="0"
                value={
                  rawPlannedInput !== null
                    ? rawPlannedInput
                    : plannedQuestionCount || ""
                }
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleCommitPlannedCount}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                placeholder="0"
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 transition-all"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Questions Added:{" "}
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {filledCount}
                </span>{" "}
                / {plannedQuestionCount}
              </p>
            </div>

            {/* Question Slot Selector Tabs */}
            {slots.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Question Slots ({slots.length})
                  </label>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Click a slot to edit
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot, sIdx) => {
                    const isFilled = isQuestionFilled(slot);
                    const isActive = sIdx === safeActiveSlotIndex;
                    return (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => setActiveSlotIndex(sIdx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isActive
                            ? "bg-red-600 text-white shadow-sm ring-2 ring-red-500/30"
                            : isFilled
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        {isFilled ? (
                          <span
                            className={
                              isActive
                                ? "text-white"
                                : "text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            ✓
                          </span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        )}
                        Slot {sIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* When 0 slots exist */}
      {slots.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl animate-in fade-in duration-300">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Set a Planned Question Count greater than 0 above to generate question slots.
          </p>
        </div>
      ) : (
        <>
          {/* 2. Question Prompt */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button
              type="button"
              onClick={() => setIsQuestionOpen(!isQuestionOpen)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                2. Question Details (Slot {safeActiveSlotIndex + 1})
              </span>
              <span className="text-slate-400 dark:text-slate-500 font-bold">
                {isQuestionOpen ? "−" : "+"}
              </span>
            </button>

            {isQuestionOpen && activeSlot && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50 dark:bg-slate-900/40">
                <div id="quiz-question-text-anchor">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                    Question Prompt <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="2"
                    value={activeSlot.questionText || ""}
                    onChange={(e) =>
                      handleActiveQuestionTextChange(e.target.value)
                    }
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
          {currentQuestionType === "multiple_choice" && activeSlot && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <button
                type="button"
                onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  3. Answer Options & Rationales (Slot {safeActiveSlotIndex + 1})
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-bold">
                  {isOptionsOpen ? "−" : "+"}
                </span>
              </button>

              {isOptionsOpen && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-900/40">
                  <div className="grid grid-cols-1 gap-3">
                    {(activeSlot.options || []).map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        id={`quiz-option-${oIdx}-anchor`}
                        className={`p-3.5 rounded-xl text-sm transition-all border ${
                          activeSlot.correctAnswerIndex === oIdx
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
                              name={`quiz-correct-choice-slot-${safeActiveSlotIndex}`}
                              checked={activeSlot.correctAnswerIndex === oIdx}
                              onChange={() =>
                                handleActiveCorrectAnswerChange(oIdx)
                              }
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <span
                              className={`text-xs font-bold uppercase tracking-wide ${
                                activeSlot.correctAnswerIndex === oIdx
                                  ? "text-red-700 dark:text-red-400"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              Option {String.fromCharCode(65 + oIdx)}{" "}
                              {activeSlot.correctAnswerIndex === oIdx &&
                                "(Correct Answer)"}
                            </span>
                          </label>
                        </div>

                        <input
                          type="text"
                          placeholder={`Choice text for option ${String.fromCharCode(
                            65 + oIdx
                          )}...`}
                          value={opt.text || ""}
                          onChange={(e) =>
                            handleActiveOptionChange(
                              oIdx,
                              "text",
                              e.target.value
                            )
                          }
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 mb-2 transition-colors"
                        />

                        <textarea
                          rows="2"
                          placeholder="Explanation/Rationale for this answer option..."
                          value={opt.rationale || ""}
                          onChange={(e) =>
                            handleActiveOptionChange(
                              oIdx,
                              "rationale",
                              e.target.value
                            )
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
              disabled={isCapped}
              onClick={handleStageQuestion}
              className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition-all uppercase tracking-wide flex items-center justify-center gap-2 ${
                isCapped
                  ? "bg-slate-400 dark:bg-slate-700 text-slate-200 cursor-not-allowed opacity-60"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              <HugeiconsIcon icon={Task01Icon} className="w-4 h-4" />
              {isCapped
                ? `Maximum Questions Staged (${filledCount} / ${plannedQuestionCount})`
                : isCurrentSlotFilled
                ? `Update Question in Slot ${safeActiveSlotIndex + 1}`
                : `+ Stage Question into Slot ${safeActiveSlotIndex + 1}`}
            </button>
          </div>

          {/* Staged Question Pool / Slots List */}
          {slots.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Question Slots & Pool ({slots.length} slot
                  {slots.length > 1 ? "s" : ""}, {filledCount} staged)
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {slots.map((q, idx) => {
                  const filled = isQuestionFilled(q);
                  const isActive = idx === safeActiveSlotIndex;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveSlotIndex(idx)}
                      className={`p-3 rounded-xl flex items-center justify-between gap-3 text-xs shadow-sm cursor-pointer transition-all border ${
                        isActive
                          ? "ring-2 ring-red-500/20 border-red-500 bg-red-50/20 dark:bg-red-950/20"
                          : filled
                          ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                          : "bg-slate-50/70 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className={`font-bold shrink-0 ${
                            filled
                              ? "text-red-600 dark:text-red-400"
                              : "text-slate-400"
                          }`}
                        >
                          Slot {idx + 1}.
                        </span>
                        <p
                          className={`truncate font-medium ${
                            filled
                              ? "text-slate-800 dark:text-slate-200"
                              : "text-slate-400 italic"
                          }`}
                        >
                          {filled
                            ? q.questionText
                            : "Empty slot — click to edit"}
                        </p>
                      </div>

                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {filled && (
                          <>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveQuestion(idx, "up")}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 disabled:opacity-30 transition-colors"
                            >
                              <HugeiconsIcon
                                icon={ArrowUp01Icon}
                                className="w-3.5 h-3.5"
                              />
                            </button>
                            <button
                              type="button"
                              disabled={idx === slots.length - 1}
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
                              <HugeiconsIcon
                                icon={Delete01Icon}
                                className="w-3.5 h-3.5"
                              />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Reduction Confirmation Modal */}
      {reductionConfirmation && (
        <ConfirmationModal
          isOpen={true}
          title="Reduce Planned Question Count"
          description={`Reducing planned question count to ${
            reductionConfirmation.newCount
          } will discard ${reductionConfirmation.discardCount} filled question${
            reductionConfirmation.discardCount > 1 ? "s" : ""
          }. Are you sure you want to proceed?`}
          confirmText="Discard & Reduce"
          onConfirm={confirmReduction}
          onClose={cancelReduction}
          type="danger"
        />
      )}

      {/* Delete Question Confirmation Modal */}
      {questionToDelete && (
        <ConfirmationModal
          isOpen={true}
          title="Remove Question from Step"
          description={`Are you sure you want to discard Question ${
            questionToDelete.index + 1
          }: "${questionToDelete.title}"?`}
          confirmText="Remove"
          onConfirm={() => removeQuestionFromStep(questionToDelete.index)}
          onClose={() => setQuestionToDelete(null)}
          type="danger"
        />
      )}
    </div>
  );
}