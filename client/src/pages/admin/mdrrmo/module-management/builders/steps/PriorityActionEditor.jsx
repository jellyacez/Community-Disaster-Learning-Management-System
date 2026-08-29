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
                ? "bg-red-50/50 border-2 border-red-500 shadow-sm" 
                : formErrors.situationalOptions 
                  ? "bg-white border-2 border-red-400" 
                  : "bg-slate-50 border border-slate-200 hover:border-slate-300"
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
                <span className={`text-xs font-bold uppercase tracking-wide ${correctIdx === oIdx ? 'text-red-700' : 'text-slate-600'}`}>
                  Choice {String.fromCharCode(65 + oIdx)} {correctIdx === oIdx && "(Correct Action)"}
                </span>
              </label>
            </div>

            <input 
              type="text" 
              placeholder={`Scenario Option ${String.fromCharCode(65 + oIdx)}`} 
              value={opt.text} 
              onChange={(e) => handleOptionChange(oIdx, 'text', e.target.value)} 
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium placeholder:text-slate-400 mb-2 transition-colors"
            />
            <textarea 
              rows="2"
              placeholder="Immediate outcome & consequences of this decision" 
              value={opt.rationale} 
              onChange={(e) => handleOptionChange(oIdx, 'rationale', e.target.value)} 
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs resize-none placeholder:text-slate-400"
            />
          </div>
        ))}
      </div>
      {formErrors.situationalOptions && <p className="text-red-500 text-xs mt-1 font-bold">{formErrors.situationalOptions}</p>}
    </div>
  );
}
