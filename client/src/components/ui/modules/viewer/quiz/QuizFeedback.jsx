export default function QuizFeedback({ 
  hasSubmitted, 
  selectedChoiceId, 
  isCorrect, 
  rationale, 
  onNextQuestion, 
  isLastQuestion 
}) {
  if (!hasSubmitted) return null;

  if (selectedChoiceId) {
    return (
      <div className={`mt-6 p-5 rounded-2xl border ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} animate-in slide-in-from-top-2 duration-300`}>
        <h4 className={`text-sm font-bold uppercase tracking-wider mb-2 ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
          {isCorrect ? 'Correct! Formative Feedback' : 'Incorrect. Formative Feedback'}
        </h4>
        <p className="text-gray-700 leading-relaxed text-sm">
          {rationale || "No rationale provided for this choice."}
        </p>
        
        <button 
          onClick={onNextQuestion}
          className={`mt-4 px-6 py-2.5 rounded-xl font-bold text-white transition-transform hover:scale-105 active:scale-95 ${
            isCorrect ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20' : 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20'
          }`}
        >
          {!isLastQuestion ? 'Next Question' : 'Complete Assessment'}
        </button>
      </div>
    );
  }

  return (
     <div className="mt-6 p-5 rounded-2xl border bg-gray-50 border-gray-200 animate-in slide-in-from-top-2 duration-300">
       <h4 className="text-sm font-bold uppercase tracking-wider mb-2 text-gray-700">Time Expired</h4>
       <p className="text-gray-600 text-sm mb-4">You did not select an answer in time.</p>
       <button 
        onClick={onNextQuestion}
        className="px-6 py-2.5 rounded-xl font-bold text-white bg-gray-800 hover:bg-black transition-transform hover:scale-105"
      >
        {!isLastQuestion ? 'Next Question' : 'Complete Assessment'}
      </button>
     </div>
  );
}
