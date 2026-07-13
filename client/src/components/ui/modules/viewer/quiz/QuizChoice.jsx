export default function QuizChoice({ opt, isSelected, hasSubmitted, onChoiceClick }) {
  let baseClasses = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 focus:outline-none";
  
  if (!hasSubmitted) {
    baseClasses += " border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-medium cursor-pointer active:scale-[0.99]";
  } else {
    // Evaluated State
    if (isSelected && opt.isCorrect) {
      baseClasses += " border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-md shadow-emerald-500/10";
    } else if (isSelected && !opt.isCorrect) {
      baseClasses += " border-red-500 bg-red-50 text-red-900 font-bold shadow-md shadow-red-500/10";
    } else if (opt.isCorrect) {
      baseClasses += " border-emerald-200 bg-emerald-50/50 text-emerald-700 font-medium"; 
    } else {
      baseClasses += " border-gray-100 bg-gray-50/50 text-gray-400 opacity-70 cursor-not-allowed";
    }
  }

  return (
    <button 
      onClick={() => onChoiceClick(opt.id)}
      disabled={hasSubmitted}
      className={baseClasses}
    >
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          isSelected ? (opt.isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-red-500 bg-red-500 text-white') 
          : (hasSubmitted && opt.isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300')
        }`}>
          {hasSubmitted && opt.isCorrect && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
          {hasSubmitted && isSelected && !opt.isCorrect && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
        </div>
        <span>{opt.text}</span>
      </div>
    </button>
  );
}
