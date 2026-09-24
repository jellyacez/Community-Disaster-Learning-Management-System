import { decodeHtml } from "../../../../../utils/textUtils";

export default function QuizChoice({ opt, isSelected, hasSubmitted, onChoiceClick, selectionOrder = 0 }) {
  let rowClasses = "w-full text-left py-3 px-4 rounded-lg transition-colors flex items-center justify-between gap-3 text-sm";
  
  if (!hasSubmitted) {
    if (isSelected) {
      rowClasses += " bg-red-50 text-red-950 font-medium border border-red-200 cursor-pointer dark:bg-red-950/40 dark:text-red-200 dark:border-red-800/60";
    } else {
      rowClasses += " bg-transparent hover:bg-gray-100/80 text-gray-800 border border-gray-200/80 cursor-pointer dark:hover:bg-slate-800/60 dark:text-slate-200 dark:border-slate-800";
    }
  } else {
    // Evaluated State
    if (isSelected && opt.isCorrect) {
      rowClasses += " bg-emerald-50 text-emerald-950 font-medium border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/60";
    } else if (isSelected && !opt.isCorrect) {
      rowClasses += " bg-red-50 text-red-950 font-medium border border-red-300 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800/60";
    } else if (opt.isCorrect) {
      rowClasses += " bg-emerald-50/50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50"; 
    } else {
      rowClasses += " opacity-50 text-gray-400 border border-gray-100 cursor-not-allowed dark:text-slate-500 dark:border-slate-800/60";
    }
  }

  return (
    <button 
      onClick={() => onChoiceClick(opt.id)}
      disabled={hasSubmitted}
      className={rowClasses}
    >
      <span className="flex-1 leading-snug">{decodeHtml(opt.text)}</span>
      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
        hasSubmitted 
          ? (isSelected ? (opt.isCorrect ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-red-600 bg-red-600 text-white') 
             : (opt.isCorrect ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 dark:border-slate-700 bg-transparent'))
          : (isSelected ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300 dark:border-slate-700 bg-transparent')
      }`}>
        {hasSubmitted && opt.isCorrect && (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {hasSubmitted && isSelected && !opt.isCorrect && (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {!hasSubmitted && isSelected && selectionOrder === 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
        )}
        {!hasSubmitted && isSelected && selectionOrder > 0 && (
          <span className="text-[9px] font-bold text-white">{selectionOrder}</span>
        )}
      </div>
    </button>
  );
}
