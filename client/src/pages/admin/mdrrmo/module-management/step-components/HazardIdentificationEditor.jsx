export default function HazardIdentificationEditor({
  currentSituationalData,
  setCurrentSituationalData,
  formErrors
}) {
  const addHazard = () => {
    setCurrentSituationalData({
      ...currentSituationalData,
      hazards: [...currentSituationalData.hazards, { text: "", rationale: "", isRequired: true }]
    });
  };

  const removeHazard = (index) => {
    if (currentSituationalData.hazards.length <= 1) return;
    const updated = [...currentSituationalData.hazards];
    updated.splice(index, 1);
    setCurrentSituationalData({ ...currentSituationalData, hazards: updated });
  };

  const handleHazardChange = (index, field, value) => {
    const updated = [...currentSituationalData.hazards];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentSituationalData({ ...currentSituationalData, hazards: updated });
  };

  return (
    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Identifiable Hazards</p>
        <button 
          type="button" 
          onClick={addHazard}
          className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100 uppercase tracking-wide"
        >
          + Add Hazard Item
        </button>
      </div>

      <div className="space-y-3">
        {currentSituationalData.hazards.map((hazard, hIdx) => (
          <div key={hIdx} className={`p-4 rounded-xl text-sm transition-all border ${
            formErrors.situationalHazards ? "border-red-500 bg-white" : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={hazard.isRequired} 
                  onChange={(e) => handleHazardChange(hIdx, "isRequired", e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Required Identification {hIdx + 1}
                </span>
              </label>
              <button 
                type="button"
                onClick={() => removeHazard(hIdx)}
                className="text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-30"
                disabled={currentSituationalData.hazards.length <= 1}
              >
                Remove
              </button>
            </div>

            <input
              type="text"
              placeholder="e.g., Exposed electrical wire near water"
              value={hazard.text}
              onChange={(e) => handleHazardChange(hIdx, 'text', e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium placeholder:text-slate-400 mb-2 transition-colors"
            />
            <textarea 
              rows="2"
              placeholder="Rationale if missed by the resident"
              value={hazard.rationale}
              onChange={(e) => handleHazardChange(hIdx, 'rationale', e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs resize-none placeholder:text-slate-400"
            />
          </div>
        ))}
        {formErrors.situationalHazards && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.situationalHazards}</p>}
      </div>
    </div>
  );
}
