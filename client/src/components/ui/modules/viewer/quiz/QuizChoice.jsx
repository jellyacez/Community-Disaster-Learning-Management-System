export default function QuizChoice({ opt, isSelected, hasSubmitted, onChoiceClick, selectionOrder = 0 }) {
  let baseClasses = "w-full text-left p-3 rounded-xl border-2 transition-all duration-300 focus:outline-none flex items-center gap-3";
  
  if (!hasSubmitted) {
    if (isSelected) {
       baseClasses += " border-red-600 bg-red-50 text-gray-900 font-bold shadow-sm cursor-pointer";
    } else {
       baseClasses += " border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-medium cursor-pointer";
    }
  } else {
    // Evaluated State
    if (isSelected && opt.isCorrect) {
      baseClasses += " border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-md shadow-emerald-500/10";
    } else if (isSelected && !opt.isCorrect) {
      baseClasses += " border-red-500 bg-red-50 text-red-900 font-bold shadow-md shadow-red-500/10";
    } else if (opt.isCorrect) {
      baseClasses += " border-emerald-200 bg-emerald-50/50 text-emerald-700 font-medium"; 
    } else {
      baseClasses += " border-gray-100 bg-white text-gray-400 opacity-70 cursor-not-allowed";
    }
  }

  return (
    <button 
      onClick={() => onChoiceClick(opt.id)}
      disabled={hasSubmitted}
      className={baseClasses}
    >
      <div className="flex-1 text-sm">{opt.text}</div>
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
        hasSubmitted 
          ? (isSelected ? (opt.isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-red-500 bg-red-500 text-white') 
             : (opt.isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-200 bg-transparent'))
          : (isSelected ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300 bg-transparent')
      }`}>
        {hasSubmitted && opt.isCorrect && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
        {hasSubmitted && isSelected && !opt.isCorrect && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
        {!hasSubmitted && isSelected && selectionOrder === 0 && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
        {!hasSubmitted && isSelected && selectionOrder > 0 && <span className="text-[11px] font-bold">{selectionOrder}</span>}
      </div>
    </button>
  );
}
