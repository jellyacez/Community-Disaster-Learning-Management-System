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

export default function InteractiveQuiz({ questions = [], isLoading = false, onCompleteStep }) {
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);
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
          setAnswers(prevAns => [...prevAns, { questionId: currentQ.question_id || currentQ.id, choiceId: null }]);
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
      setSelectedChoiceId(null);
      setHasSubmitted(false);
      setTimeLeft(20);
    } else {
      onCompleteStep(answers);
    }
  };

  const handleChoiceClick = (choiceId) => {
    if (hasSubmitted || isLocked) return;
    setSelectedChoiceId(choiceId);
    setHasSubmitted(true);
    setAnswers(prev => [...prev, { questionId: currentQ.question_id || currentQ.id, choiceId }]);
  };

  const handlePreventCopy = (e) => e.preventDefault();

  if (isLoading) return <QuizStateMessage type="loading" />;
  if (isLocked) return <QuizStateMessage type="locked" onRestart={() => window.location.reload()} />;
  if (questions.length === 0) return <QuizStateMessage type="empty" onBypass={() => onCompleteStep([])} />;
  if (!currentQ) return null;

  const isCorrect = selectedChoiceId && currentQ.options.find(o => o.id === selectedChoiceId)?.isCorrect;
  const rationale = currentQ.options.find(o => o.id === selectedChoiceId)?.rationale;

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
            isSelected={selectedChoiceId === opt.id} 
            hasSubmitted={hasSubmitted} 
            onChoiceClick={handleChoiceClick} 
          />
        ))}
      </div>

      <QuizFeedback 
        hasSubmitted={hasSubmitted}
        selectedChoiceId={selectedChoiceId}
        isCorrect={isCorrect}
        rationale={rationale}
        onNextQuestion={handleNextQuestion}
        isLastQuestion={currentQIndex >= shuffledQuestions.length - 1}
      />
    </div>
  );
}
