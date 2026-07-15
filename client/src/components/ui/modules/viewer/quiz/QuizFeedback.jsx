export default function QuizFeedback({ 
  hasSubmitted, 
  selectedChoiceId, 
  isCorrect, 
  rationale,
  isLocked
}) {
  if (!hasSubmitted && !isLocked) return null;

  if (selectedChoiceId) {
    return (
      <div className={`mt-6 p-5 rounded-2xl border ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} animate-in slide-in-from-top-2 duration-300`}>
        <h4 className={`text-sm font-bold uppercase tracking-wider mb-2 ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
          {isCorrect ? 'Correct! Formative Feedback' : 'Incorrect. Formative Feedback'}
        </h4>
        <p className="text-gray-700 leading-relaxed text-sm">
          {rationale || "No rationale provided for this choice."}
        </p>
      </div>
    );
  }

  return (
     <div className="mt-6 p-5 rounded-2xl border bg-gray-50 border-gray-200 animate-in slide-in-from-top-2 duration-300">
       <h4 className="text-sm font-bold uppercase tracking-wider mb-2 text-gray-700">Time Expired</h4>
       <p className="text-gray-600 text-sm mb-4">You did not select an answer in time.</p>
     </div>
  );
}
