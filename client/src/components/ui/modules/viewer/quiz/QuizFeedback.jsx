import { decodeHtml } from "../../../../../utils/textUtils";

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
      <div className={`mt-4 p-4 rounded-lg border ${isCorrect ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60' : 'bg-red-50/70 border-red-200 dark:bg-red-950/40 dark:border-red-800/60'} transition-all`}>
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isCorrect ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
          {isCorrect ? 'Correct' : 'Incorrect'}
        </h4>
        <p className="text-gray-700 dark:text-slate-200 leading-relaxed text-xs md:text-sm">
          {decodeHtml(rationale) || "No rationale provided for this choice."}
        </p>
      </div>
    );
  }

  return (
     <div className="mt-4 p-4 rounded-lg border bg-gray-50 border-gray-200 dark:bg-slate-900 dark:border-slate-800 transition-all">
       <h4 className="text-xs font-bold uppercase tracking-wider mb-1 text-gray-700 dark:text-slate-200">Time Expired</h4>
       <p className="text-gray-600 dark:text-slate-400 text-xs md:text-sm">You did not select an answer in time.</p>
     </div>
  );
}
