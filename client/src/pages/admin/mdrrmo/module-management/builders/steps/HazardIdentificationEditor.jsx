import { useEffect } from "react";

export default function HazardIdentificationEditor({
  currentSituationalData,
  setCurrentSituationalData,
  formErrors
}) {
  useEffect(() => {
    if (!currentSituationalData.hazards || currentSituationalData.hazards.length === 0) {
      setCurrentSituationalData((prev) => ({
        ...prev,
        hazards: [{ text: "", rationale: "", isRequired: true }]
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hazardsList = currentSituationalData.hazards?.length > 0 ? currentSituationalData.hazards : [{ text: "", rationale: "", isRequired: true }];

  const addHazard = () => {
    setCurrentSituationalData({
      ...currentSituationalData,
      hazards: [...hazardsList, { text: "", rationale: "", isRequired: true }]
    });
  };

  const removeHazard = (index) => {
    if (hazardsList.length <= 1) return;
    const updated = [...hazardsList];
    updated.splice(index, 1);
    setCurrentSituationalData({ ...currentSituationalData, hazards: updated });
  };

  const handleHazardChange = (index, field, value) => {
    const updated = [...hazardsList];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentSituationalData({ ...currentSituationalData, hazards: updated });
  };

  return (
    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Identifiable Hazards</p>
        <button 
          type="button" 
          onClick={addHazard}
          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/50 uppercase tracking-wide"
        >
          + Add Hazard Item
        </button>
      </div>

      <div className="space-y-3">
        {hazardsList.map((hazard, hIdx) => (
          <div 
            key={hIdx} 
            id={`situational-hazard-${hIdx}-anchor`}
            className={`p-4 rounded-xl text-sm transition-all border ${
            formErrors.situationalHazards ? "border-red-500 bg-white dark:bg-slate-800" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-800"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={hazard.isRequired} 
                  onChange={(e) => handleHazardChange(hIdx, "isRequired", e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Required Identification {hIdx + 1}
                </span>
              </label>
              <button 
                type="button" 
                onClick={() => removeHazard(hIdx)}
                className="text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-30"
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
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 mb-2 transition-colors"
            />
            <textarea 
              rows="2"
              placeholder="Rationale if missed by the resident"
              value={hazard.rationale}
              onChange={(e) => handleHazardChange(hIdx, 'rationale', e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-xs text-slate-900 dark:text-slate-100 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        ))}
        {formErrors.situationalHazards && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.situationalHazards}</p>}
      </div>
    </div>
  );
}
