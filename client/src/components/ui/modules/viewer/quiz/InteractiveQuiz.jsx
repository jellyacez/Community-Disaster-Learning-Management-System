import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import QuizHeader from './QuizHeader';
import QuizChoice from './QuizChoice';
import QuizFeedback from './QuizFeedback';
import QuizStateMessage from './QuizStateMessage';
import { decodeHtml } from '../../../../../utils/textUtils';
import { getQuizSession, saveQuizSession, clearQuizSession } from '../../../../../lib/quizSessions';
import { HugeiconsIcon } from '@hugeicons/react';
import { Clock01Icon } from '@hugeicons/core-free-icons';

const QUESTION_SECONDS = 20;

// Rebuild the saved question/option order; null if the questions no longer match
function restoreOrder(questions, order) {
  const byId = new Map(questions.map((q) => [q.question_id || q.id, q]));
  const restored = order.map(({ id, optionIds }) => {
    const q = byId.get(id);
    if (!q) return null;
    const optsById = new Map((q.options || []).map((o) => [o.id, o]));
    const options = optionIds.map((oid) => optsById.get(oid));
    return options.every(Boolean) && options.length === (q.options || []).length ? { ...q, options } : null;
  });
  return restored.length === questions.length && restored.every(Boolean) ? restored : null;
}

// Fisher-Yates shuffle
function shuffle(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function InteractiveQuiz({ stepId, stepType, questions = [], isLoading = false, onCompleteStep, isPreviewMode = false }) {
  // Resume an attempt the learner left mid-way (another step, the map, the dashboard).
  // Previews never persist.
  const [savedSession] = useState(() => (isPreviewMode || stepId == null ? null : getQuizSession(stepId)));
  const [currentQIndex, setCurrentQIndex] = useState(savedSession?.currentQIndex ?? 0);
  const [selectedChoiceIds, setSelectedChoiceIds] = useState(savedSession?.selectedChoiceIds ?? []);
  const [hasSubmitted, setHasSubmitted] = useState(savedSession?.hasSubmitted ?? false);
  // Absolute deadline for the current question: the clock keeps running while away
  const [deadline, setDeadline] = useState(savedSession?.deadline ?? null);
  const [timeLeft, setTimeLeft] = useState(() =>
    savedSession?.deadline ? Math.max(0, Math.ceil((savedSession.deadline - Date.now()) / 1000)) : QUESTION_SECONDS
  );
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(savedSession?.tabSwitchWarnings ?? 0);
  const [answers, setAnswers] = useState(savedSession?.answers ?? []);
  const [timedOutWhileAway] = useState(
    () => Boolean(savedSession && !savedSession.hasSubmitted && savedSession.deadline && savedSession.deadline <= Date.now())
  );
  const submittedRef = useRef(false);

  // 1. DYNAMIC RANDOMIZATION (kept stable when resuming)
  const shuffledQuestions = useMemo(() => {
    if (!questions || questions.length === 0) return [];
    const restored = savedSession?.order ? restoreOrder(questions, savedSession.order) : null;
    if (restored) return restored;
    return shuffle(questions).map(q => ({
      ...q,
      options: shuffle(q.options || [])
    }));
  }, [questions, savedSession]);

  const currentQ = shuffledQuestions[currentQIndex];

  const actualStepType = useMemo(() => {
    if (stepType !== 'situational') return stepType;
    if (!currentQ) return stepType;
    if (currentQ.options && currentQ.options.some(o => o.sequenceOrder > 0)) return 'action_sequence';
    if (currentQ.options && currentQ.options.filter(o => o.isCorrect).length > 1) return 'hazard_identification';
    return 'priority_action';
  }, [stepType, currentQ]);

  const isMultiSelect = actualStepType === 'hazard_identification' || actualStepType === 'action_sequence';
  
  const isLocked = tabSwitchWarnings >= 2;

  // 2. THE VISIBILITY API (Tab-Switching Detection)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isLocked && !hasSubmitted && currentQ && !isPreviewMode) {
        setTabSwitchWarnings(prev => prev + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isLocked, hasSubmitted, currentQ]);

  useEffect(() => {
    if (tabSwitchWarnings === 1) {
      toast.error("Attention: Navigating away from the active assessment window is not permitted. Further infractions will lock the assessment.", { duration: 6000, id: 'tab-warn-1' });
    } else if (tabSwitchWarnings >= 2) {
      toast.error("Assessment Locked: Multiple unauthorized navigation events detected. Please restart the module.", { duration: 6000, id: 'tab-warn-2' });
    }
  }, [tabSwitchWarnings]);

  const selectedChoiceIdsRef = useRef(selectedChoiceIds);
  useEffect(() => {
    selectedChoiceIdsRef.current = selectedChoiceIds;
  }, [selectedChoiceIds]);

  // 3. STRICT DEADLINE-BASED TIMER
  // Measured against an absolute deadline, so time spent away from the quiz still counts.
  useEffect(() => {
    if (!currentQ || hasSubmitted || isLocked || isPreviewMode) return;

    const activeDeadline = deadline ?? Date.now() + QUESTION_SECONDS * 1000;
    let expired = false;
    const tick = () => {
      if (expired) return;
      if (deadline == null) setDeadline(activeDeadline);
      const remaining = Math.max(0, Math.ceil((activeDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        expired = true;
        setHasSubmitted(true);
        setAnswers(prevAns => [...prevAns, { questionId: currentQ.question_id || currentQ.id, selectedChoiceIds: selectedChoiceIdsRef.current }]);
      }
    };

    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [currentQ, hasSubmitted, isLocked, deadline, isPreviewMode]);

  // Tell a returning learner the clock kept running and the question timed out
  useEffect(() => {
    if (!timedOutWhileAway) return;
    toast("Time ran out on this question while you were away. It was counted as unanswered.", {
      icon: <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5 shrink-0 text-amber-600" aria-hidden="true" />,
      duration: 6000,
      id: "quiz-timed-out-away",
    });
  }, [timedOutWhileAway]);

  // Keep the attempt so leaving and returning resumes it
  useEffect(() => {
    if (isPreviewMode || stepId == null || shuffledQuestions.length === 0 || submittedRef.current) return;
    saveQuizSession(stepId, {
      order: shuffledQuestions.map(q => ({ id: q.question_id || q.id, optionIds: (q.options || []).map(o => o.id) })),
      currentQIndex,
      answers,
      selectedChoiceIds,
      hasSubmitted,
      deadline,
      tabSwitchWarnings,
    });
  }, [isPreviewMode, stepId, shuffledQuestions, currentQIndex, answers, selectedChoiceIds, hasSubmitted, deadline, tabSwitchWarnings]);

  const finishAttempt = (finalAnswers) => {
    submittedRef.current = true;
    if (stepId != null) clearQuizSession(stepId);
    onCompleteStep(finalAnswers);
  };

  // Reset state for next question
  const handleNextQuestion = () => {
    if (currentQIndex < shuffledQuestions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedChoiceIds([]);
      setHasSubmitted(false);
      setTimeLeft(QUESTION_SECONDS);
      setDeadline(Date.now() + QUESTION_SECONDS * 1000);
    } else {
      finishAttempt(answers);
    }
  };

  const handleChoiceClick = (choiceId) => {
    if (hasSubmitted || isLocked) return;
    
    if (isMultiSelect) {
      setSelectedChoiceIds(prev => 
        prev.includes(choiceId) ? prev.filter(id => id !== choiceId) : [...prev, choiceId]
      );
    } else {
      setSelectedChoiceIds([choiceId]);
      submitAnswer([choiceId]);
    }
  };

  const submitAnswer = (choiceIds) => {
    setHasSubmitted(true);
    setAnswers(prev => [...prev, { questionId: currentQ.question_id || currentQ.id, selectedChoiceIds: choiceIds }]);
  };

  const handlePreventCopy = (e) => e.preventDefault();

  if (isLoading) return <QuizStateMessage type="loading" />;
  if (isLocked) return <QuizStateMessage type="locked" onRestart={() => window.location.reload()} />;
  if (questions.length === 0) return <QuizStateMessage type="empty" onBypass={isPreviewMode ? () => finishAttempt([]) : undefined} />;
  if (!currentQ) return null;

  const isCorrect = (() => {
    if (actualStepType === 'action_sequence') {
      const correctSequence = [...currentQ.options]
        .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
        .map(o => o.id);
      return JSON.stringify(selectedChoiceIds) === JSON.stringify(correctSequence);
    }
    
    if (isMultiSelect) { // hazard_identification
      const correctOptionIds = currentQ.options.filter(o => o.isCorrect).map(o => o.id);
      return selectedChoiceIds.length === correctOptionIds.length && selectedChoiceIds.every(id => correctOptionIds.includes(id));
    }
    
    // regular quiz
    return selectedChoiceIds.length > 0 && currentQ.options.find(o => o.id === selectedChoiceIds[0])?.isCorrect;
  })();
    
  const rationale = selectedChoiceIds.length > 0 ? currentQ.options.find(o => o.id === selectedChoiceIds[0])?.rationale : null;

  return (
    <div 
      className={`w-full pt-2 select-none ${isPreviewMode ? 'opacity-95' : ''}`}
      onCopy={!isPreviewMode ? handlePreventCopy : undefined}
      onContextMenu={!isPreviewMode ? handlePreventCopy : undefined}
    >
      <QuizHeader 
        currentQIndex={currentQIndex} 
        totalQuestions={shuffledQuestions.length} 
        timeLeft={isPreviewMode ? null : timeLeft} 
      />

      {/* Question */}
      <h2 className="text-xl font-semibold text-gray-900 mb-6 leading-snug">
        {decodeHtml(currentQ.question_text)}
      </h2>

      {/* Choices */}
      <div className="space-y-2.5 mb-6">
        {currentQ.options.map((opt) => (
          <QuizChoice 
            key={opt.id} 
            opt={opt} 
            isSelected={selectedChoiceIds.includes(opt.id)} 
            selectionOrder={actualStepType === 'action_sequence' && selectedChoiceIds.includes(opt.id) ? selectedChoiceIds.indexOf(opt.id) + 1 : 0}
            hasSubmitted={hasSubmitted || isPreviewMode} 
            onChoiceClick={isPreviewMode ? () => {} : handleChoiceClick} 
          />
        ))}
      </div>

      {isMultiSelect && !hasSubmitted && !isPreviewMode && (
        <div className="mt-4 flex justify-end">
          <button 
            onClick={() => submitAnswer(selectedChoiceIds)}
            disabled={selectedChoiceIds.length === 0}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        </div>
      )}

      {/* Footer Area with Next Action */}
      <div className="mt-6">
        {(hasSubmitted || isLocked) && !isPreviewMode && (
          <QuizFeedback 
            hasSubmitted={hasSubmitted}
            selectedChoiceId={selectedChoiceIds.length > 0 ? selectedChoiceIds[0] : null}
            isCorrect={isCorrect}
            rationale={rationale}
            isLocked={isLocked}
          />
        )}
        
        {(hasSubmitted || isPreviewMode) && !isLocked && (
          <button 
            onClick={handleNextQuestion}
            className="w-full mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>{currentQIndex < shuffledQuestions.length - 1 ? (isPreviewMode ? 'Next Question' : 'Next Question') : (isPreviewMode ? 'Complete Preview' : 'Complete Assessment')}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
