export default function PriorityActionEditor({
  currentSituationalData,
  setCurrentSituationalData,
  formErrors
}) {
  const correctIdx = currentSituationalData.correctAnswerIndex != null ? Number(currentSituationalData.correctAnswerIndex) : 0;

  const handleOptionChange = (index, field, value) => {
    const updatedOptions = [...currentSituationalData.options];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setCurrentSituationalData({ ...currentSituationalData, options: updatedOptions });
  };

  const handleCorrectAnswerChange = (index) => {
    setCurrentSituationalData({ ...currentSituationalData, correctAnswerIndex: index });
  };

  return (
    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 gap-3">
        {currentSituationalData.options.map((opt, oIdx) => (
          <div 
            key={oIdx} 
            id={`situational-option-${oIdx}-anchor`}
            className={`p-4 rounded-xl text-sm transition-all ${
              correctIdx === oIdx 
                ? "bg-red-50/50 dark:bg-red-950/30 border-2 border-red-500 shadow-sm" 
                : formErrors.situationalOptions 
                  ? "bg-white dark:bg-slate-800 border-2 border-red-400" 
                  : "bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="situational-priority-choice" 
                  checked={correctIdx === oIdx} 
                  onChange={() => handleCorrectAnswerChange(oIdx)}
                  className="w-4 h-4 text-red-600 focus:ring-red-500"
                />
                <span className={`text-xs font-bold uppercase tracking-wide ${correctIdx === oIdx ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  Choice {String.fromCharCode(65 + oIdx)} {correctIdx === oIdx && "(Correct Action)"}
                </span>
              </label>
            </div>

            <input 
              type="text" 
              placeholder={`Scenario Option ${String.fromCharCode(65 + oIdx)}`} 
              value={opt.text} 
              onChange={(e) => handleOptionChange(oIdx, 'text', e.target.value)} 
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 mb-2 transition-colors"
            />
            <textarea 
              rows="2"
              placeholder="Immediate outcome & consequences of this decision" 
              value={opt.rationale} 
              onChange={(e) => handleOptionChange(oIdx, 'rationale', e.target.value)} 
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-xs text-slate-900 dark:text-slate-100 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        ))}
      </div>
      {formErrors.situationalOptions && <p className="text-red-500 text-xs mt-1 font-bold">{formErrors.situationalOptions}</p>}
    </div>
  );
}
