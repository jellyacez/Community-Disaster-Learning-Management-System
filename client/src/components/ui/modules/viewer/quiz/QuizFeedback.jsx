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
      <div className={`mt-4 p-4 rounded-lg border ${isCorrect ? 'bg-emerald-50/70 border-emerald-200' : 'bg-red-50/70 border-red-200'} transition-all`}>
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
          {isCorrect ? 'Correct' : 'Incorrect'}
        </h4>
        <p className="text-gray-700 leading-relaxed text-xs md:text-sm">
          {rationale || "No rationale provided for this choice."}
        </p>
      </div>
    );
  }

  return (
     <div className="mt-4 p-4 rounded-lg border bg-gray-50 border-gray-200 transition-all">
       <h4 className="text-xs font-bold uppercase tracking-wider mb-1 text-gray-700">Time Expired</h4>
       <p className="text-gray-600 text-xs md:text-sm">You did not select an answer in time.</p>
     </div>
  );
}
