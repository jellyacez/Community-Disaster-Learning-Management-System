import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HugeiconsIcon } from '@hugeicons/react';
import { Clock01Icon, WifiDisconnected01Icon } from '@hugeicons/core-free-icons';
import apiClient from '../../../../../lib/apiClient';
import { saveQuizSession, clearQuizSession } from '../../../../../lib/quizSessions';
import { decodeHtml } from '../../../../../utils/textUtils';
import QuizHeader from './QuizHeader';
import QuizChoice from './QuizChoice';
import QuizFeedback from './QuizFeedback';
import QuizStateMessage from './QuizStateMessage';

// Final assessment backed by a server-owned attempt. The server fixes the question order and
// each question's deadline, records the first answer, and only then reveals that question's
// key. Reloading, closing the tab, or switching steps resumes the same attempt.

const decodeQuestion = (q) => ({
  ...q,
  question_text: decodeHtml(q.question_text),
  rationale: q.rationale ? decodeHtml(q.rationale) : null,
  options: (q.options || []).map((o) => ({
    ...o,
    text: decodeHtml(o.text),
    ...(o.rationale !== undefined && { rationale: decodeHtml(o.rationale) }),
  })),
});

const describeError = (error, fallback) =>
  error?.response?.data?.message || (!error?.response ? 'Connection problem. Check your internet and try again.' : fallback);

export default function AttemptQuiz({ stepId, onSubmitAttempt, retryCount = 0 }) {
  const { moduleId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [selected, setSelected] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const deadlineRef = useRef(null);
  const selectedRef = useRef(selected);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Every server reply carries the full attempt state; derive the local clock from it
  const applyState = useCallback(
    (state) => {
      const isOpen = state.status === 'open';
      if (isOpen) saveQuizSession(stepId, { attemptId: state.attemptId });
      else clearQuizSession(stepId);

      deadlineRef.current =
        state.remainingSeconds != null ? Date.now() + state.remainingSeconds * 1000 : null;
      setTimeLeft(state.remainingSeconds);
      setAttempt({ ...state, questions: state.questions.map(decodeQuestion) });

      const current = state.questions[state.currentIndex];
      setSelected(current?.answer ? current.answer.selectedChoiceIds : []);

      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        if (isOpen && current?.answer?.timedOut) {
          toast('Time ran out on this question while you were away. It was counted as unanswered.', {
            icon: <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5 shrink-0 text-amber-600" aria-hidden="true" />,
            duration: 6000,
            id: 'quiz-timed-out-away',
          });
        }
      }
    },
    [stepId]
  );

  const startAttempt = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOffline(true);
      return;
    }
    setIsOffline(false);
    setLoadError(null);
    try {
      const res = await apiClient.post(`/modules/${moduleId}/steps/${stepId}/attempts`);
      applyState(res.data.data);
    } catch (error) {
      if (!error.response) setIsOffline(true);
      else setLoadError(describeError(error, 'Could not load the assessment.'));
    }
  }, [moduleId, stepId, applyState]);

  // Start or resume when the step opens (and for a fresh attempt after "Try Again")
  useEffect(() => {
     
    startAttempt();
  }, [startAttempt, retryCount]);

  // Reconnecting picks the attempt up again (start or resume)
  useEffect(() => {
    if (!isOffline) return;
    window.addEventListener('online', startAttempt);
    return () => window.removeEventListener('online', startAttempt);
  }, [isOffline, startAttempt]);

  // Runs one attempt action; an attempt that ended elsewhere (e.g. another tab) is reloaded
  const act = async (path, body) => {
    if (!attempt || isBusy) return null;
    setIsBusy(true);
    try {
      const res = await apiClient.post(`/modules/attempts/${attempt.attemptId}/${path}`, body);
      applyState(res.data.data);
      return res.data.data;
    } catch (error) {
      const code = error.response?.data?.error;
      toast.error(describeError(error, 'Something went wrong. Please try again.'), { id: 'attempt-error' });
      if (['ATTEMPT_CLOSED', 'WRONG_QUESTION', 'ALREADY_ANSWERED', 'NOT_ANSWERED'].includes(code)) {
        await startAttempt();
      }
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const current = attempt?.questions[attempt.currentIndex];
  const hasAnswered = Boolean(current?.answer);
  const isLocked = attempt?.status === 'locked';

  const submitAnswer = (choiceIds) =>
    act('answers', { questionId: current.question_id, selectedChoiceIds: choiceIds });

  // Server-side deadline: when it passes, lock in whatever is selected (empty = unanswered)
  useEffect(() => {
    if (!attempt || attempt.status !== 'open' || hasAnswered || deadlineRef.current == null) return;
    let fired = false;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !fired) {
        fired = true;
        submitAnswer(selectedRef.current);
      }
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the question changes
  }, [attempt?.attemptId, attempt?.currentIndex, attempt?.status, hasAnswered]);

  // Leaving the browser tab counts against the attempt (server decides when it locks)
  useEffect(() => {
    if (!attempt || attempt.status !== 'open') return;
    const handleVisibility = async () => {
      if (document.visibilityState !== 'hidden') return;
      const state = await act('tab-switches');
      if (state?.status === 'locked') {
        toast.error('Assessment locked: you left the assessment window too many times.', { id: 'tab-warn-2', duration: 6000 });
      } else if (state) {
        toast.error('Leaving the assessment window is not permitted. Leaving again will lock the assessment.', {
          id: 'tab-warn-1',
          duration: 6000,
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-bind per attempt
  }, [attempt?.attemptId, attempt?.status]);

  const handleChoiceClick = (choiceId) => {
    if (hasAnswered || isBusy || isLocked) return;
    if (current.kind === 'single') {
      setSelected([choiceId]);
      submitAnswer([choiceId]);
    } else {
      setSelected((prev) => (prev.includes(choiceId) ? prev.filter((id) => id !== choiceId) : [...prev, choiceId]));
    }
  };

  const handleNext = async () => {
    const isLast = attempt.currentIndex >= attempt.total - 1;
    if (!isLast) {
      await act('next', { fromIndex: attempt.currentIndex });
      return;
    }
    // The viewer clears the in-progress marker once the submit succeeds
    onSubmitAttempt(attempt.attemptId);
  };

  if (isOffline) {
    return (
      <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-3xl dark:bg-slate-900/40 dark:border-slate-800">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-amber-950/50 dark:text-amber-400">
          <HugeiconsIcon icon={WifiDisconnected01Icon} className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2 dark:text-white">Connect to take the final assessment</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Final assessments are graded live, so they need an internet connection. Your other progress is saved offline.
        </p>
        <button
          type="button"
          onClick={startAttempt}
          className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition"
        >
          Try again
        </button>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 text-center text-gray-600 bg-gray-50 border border-gray-200 rounded-3xl">
        <p className="text-sm mb-4">{loadError}</p>
        <button type="button" onClick={startAttempt} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition">
          Retry
        </button>
      </div>
    );
  }

  if (!attempt) return <QuizStateMessage type="loading" />;
  if (isLocked) return <QuizStateMessage type="locked" onRestart={startAttempt} />;
  if (attempt.total === 0) return <QuizStateMessage type="empty" />;
  if (!current) return null;

  // Only action sequences use a question-level explanation; everything else shows the chosen option's rationale
  const choiceRationale = selected.length > 0 ? current.options.find((o) => o.id === selected[0])?.rationale : null;
  const rationale = (current.kind === 'sequence' && current.rationale) || choiceRationale;
  const isLast = attempt.currentIndex >= attempt.total - 1;

  return (
    <div className="w-full pt-2 select-none" onCopy={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
      <QuizHeader currentQIndex={attempt.currentIndex} totalQuestions={attempt.total} timeLeft={hasAnswered ? null : timeLeft ?? 0} />

      <h2 className="text-xl font-semibold text-gray-900 mb-6 leading-snug">{current.question_text}</h2>

      <div className="space-y-2.5 mb-6">
        {current.options.map((opt) => (
          <QuizChoice
            key={opt.id}
            opt={opt}
            isSelected={selected.includes(opt.id)}
            selectionOrder={current.kind === 'sequence' && selected.includes(opt.id) ? selected.indexOf(opt.id) + 1 : 0}
            hasSubmitted={hasAnswered}
            onChoiceClick={handleChoiceClick}
          />
        ))}
      </div>

      {current.kind !== 'single' && !hasAnswered && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => submitAnswer(selected)}
            disabled={selected.length === 0 || isBusy}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        </div>
      )}

      <div className="mt-6">
        {hasAnswered && (
          <QuizFeedback
            hasSubmitted
            selectedChoiceId={selected.length > 0 ? selected[0] : null}
            isCorrect={current.answer.correct}
            rationale={rationale}
            isLocked={false}
          />
        )}

        {hasAnswered && (
          <button
            onClick={handleNext}
            disabled={isBusy}
            className="w-full mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>{isLast ? 'Complete Assessment' : 'Next Question'}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
