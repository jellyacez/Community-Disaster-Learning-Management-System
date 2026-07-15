import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import QuizHeader from './QuizHeader';
import QuizChoice from './QuizChoice';
import QuizFeedback from './QuizFeedback';
import QuizStateMessage from './QuizStateMessage';

// Fisher-Yates shuffle
function shuffle(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function InteractiveQuiz({ stepType, questions = [], isLoading = false, onCompleteStep }) {
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedChoiceIds, setSelectedChoiceIds] = useState([]);
  const isMultiSelect = stepType === 'hazard_identification' || stepType === 'action_sequence';
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [answers, setAnswers] = useState([]);
  
  // 1. DYNAMIC RANDOMIZATION
  useEffect(() => {
    if (questions && questions.length > 0) {
      const shuffledQ = shuffle(questions).map(q => ({
        ...q,
        options: shuffle(q.options || [])
      }));
      setShuffledQuestions(shuffledQ);
    }
  }, [questions]);

  const currentQ = shuffledQuestions[currentQIndex];

  // 2. THE VISIBILITY API (Tab-Switching Detection)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isLocked && !hasSubmitted && currentQ) {
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
      setIsLocked(true);
      toast.error("Assessment Locked: Multiple unauthorized navigation events detected. Please restart the module.", { duration: 6000, id: 'tab-warn-2' });
    }
  }, [tabSwitchWarnings]);

  // 3. STRICT COMPONENT-LEVEL TIMERS
  useEffect(() => {
    if (!currentQ || hasSubmitted || isLocked) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setHasSubmitted(true);
          setAnswers(prevAns => [...prevAns, { questionId: currentQ.question_id || currentQ.id, selectedChoiceIds }]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [currentQ, hasSubmitted, isLocked, currentQIndex]);

  // Reset state for next question
  const handleNextQuestion = () => {
    if (currentQIndex < shuffledQuestions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedChoiceIds([]);
      setHasSubmitted(false);
      setTimeLeft(20);
    } else {
      onCompleteStep(answers);
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
  if (questions.length === 0) return <QuizStateMessage type="empty" onBypass={() => onCompleteStep([])} />;
  if (!currentQ) return null;

  const isCorrect = (() => {
    if (stepType === 'action_sequence') {
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
      className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden select-none"
      onCopy={handlePreventCopy}
      onContextMenu={handlePreventCopy}
    >
      <QuizHeader 
        currentQIndex={currentQIndex} 
        totalQuestions={shuffledQuestions.length} 
        timeLeft={timeLeft} 
      />

      {/* Question */}
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 leading-relaxed">
        {currentQ.question_text}
      </h2>

      {/* Choices */}
      <div className="space-y-3">
        {currentQ.options.map((opt) => (
          <QuizChoice 
            key={opt.id} 
            opt={opt} 
            isSelected={selectedChoiceIds.includes(opt.id)} 
            selectionOrder={stepType === 'action_sequence' && selectedChoiceIds.includes(opt.id) ? selectedChoiceIds.indexOf(opt.id) + 1 : 0}
            hasSubmitted={hasSubmitted} 
            onChoiceClick={handleChoiceClick} 
          />
        ))}
      </div>

      {isMultiSelect && !hasSubmitted && (
        <div className="mt-6 flex justify-end">
          <button 
            onClick={() => submitAnswer(selectedChoiceIds)}
            disabled={selectedChoiceIds.length === 0}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        </div>
      )}

      <QuizFeedback 
        hasSubmitted={hasSubmitted}
        selectedChoiceId={selectedChoiceIds[0]}
        isCorrect={isCorrect}
        rationale={rationale}
        onNextQuestion={handleNextQuestion}
        isLastQuestion={currentQIndex >= shuffledQuestions.length - 1}
      />
    </div>
  );
}
