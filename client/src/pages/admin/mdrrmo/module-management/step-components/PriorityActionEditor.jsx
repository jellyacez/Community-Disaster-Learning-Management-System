export default function PriorityActionEditor({
  currentSituationalData,
  setCurrentSituationalData,
  formErrors
}) {
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
          <div key={oIdx} className={`p-4 rounded-xl text-sm transition-all ${
              currentSituationalData.correctAnswerIndex === oIdx 
                ? "border-2 border-emerald-500 bg-emerald-50 shadow-sm" 
                : formErrors.situationalOptions ? "border border-red-500 bg-white" : "border border-slate-200 bg-slate-50 hover:bg-slate-100/50"
            }`}>
            <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${
              currentSituationalData.correctAnswerIndex === oIdx ? "text-emerald-700" : "text-slate-500"
            }`}>
             Priority Action Option {oIdx + 1} {currentSituationalData.correctAnswerIndex === oIdx && "(Correct Action)"}
            </label>

            <input
              type="text"
              placeholder="Enter action choice"
              value={opt.text}
              onChange={(e) => handleOptionChange(oIdx, 'text', e.target.value)}
              className={`w-full p-2.5 bg-white border ${currentSituationalData.correctAnswerIndex === oIdx ? 'border-emerald-300' : 'border-slate-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium placeholder:text-slate-400 mb-2 transition-colors`}
            />
            <textarea 
              rows="2"
              placeholder={`Rationale / Formative Feedback (Shown if selected)`}
              value={opt.rationale}
              onChange={(e) => handleOptionChange(oIdx, 'rationale', e.target.value)}
              className={`w-full p-2.5 bg-white border ${currentSituationalData.correctAnswerIndex === oIdx ? 'border-emerald-200' : 'border-slate-200'} rounded-lg focus:outline-none text-xs resize-none placeholder:text-slate-400`}
            />
          </div>
        ))}
        {formErrors.situationalOptions && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.situationalOptions}</p>}
      </div>
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
        <select 
          value={currentSituationalData.correctAnswerIndex} 
          onChange={(e) => handleCorrectAnswerChange(parseInt(e.target.value))} 
          className="p-2 border border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value={0}>Option 1 is correct</option>
          <option value={1}>Option 2 is correct</option>
          <option value={2}>Option 3 is correct</option>
          <option value={3}>Option 4 is correct</option>
        </select>
      </div>
    </div>
  );
}
