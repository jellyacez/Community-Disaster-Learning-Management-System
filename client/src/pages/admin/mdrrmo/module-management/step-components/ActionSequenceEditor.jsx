import { useEffect } from "react";

export default function ActionSequenceEditor({
  currentSituationalData,
  setCurrentSituationalData,
  formErrors,
  addSituationalScenarioToStep
}) {
  useEffect(() => {
    if (!currentSituationalData.sequenceSteps || currentSituationalData.sequenceSteps.length < 2) {
      setCurrentSituationalData((prev) => ({
        ...prev,
        sequenceSteps: [
          { text: "", order: 1 },
          { text: "", order: 2 }
        ]
      }));
    }
  }, []);

  const stepsList = currentSituationalData.sequenceSteps?.length >= 2 ? currentSituationalData.sequenceSteps : [
    { text: "", order: 1 },
    { text: "", order: 2 }
  ];

  const addStep = () => {
    setCurrentSituationalData({
      ...currentSituationalData,
      sequenceSteps: [
        ...stepsList, 
        { text: "", order: stepsList.length + 1 }
      ]
    });
  };

  const removeStep = (index) => {
    if (stepsList.length <= 2) return;
    const updated = [...stepsList];
    updated.splice(index, 1);
    
    // Re-normalize the 'order' values
    updated.forEach((step) => {
      if (step.order > updated.length) {
        step.order = updated.length;
      }
    });

    setCurrentSituationalData({ ...currentSituationalData, sequenceSteps: updated });
  };

  const handleStepChange = (index, field, value) => {
    const updated = [...stepsList];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentSituationalData({ ...currentSituationalData, sequenceSteps: updated });
  };

  return (
    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Action Sequence Steps</p>
        <button 
          type="button" 
          onClick={addStep}
          className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-md hover:bg-sky-100 uppercase tracking-wide"
        >
          + Add Sequence Step
        </button>
      </div>

      <div className="space-y-3">
        {stepsList.map((step, sIdx) => (
          <div key={sIdx} className={`flex items-start gap-3 p-3 rounded-xl transition-all border ${
            formErrors.situationalSequence ? "border-red-500 bg-white" : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
          }`}>
            <div className="pt-1">
              <select 
                value={step.order}
                onChange={(e) => handleStepChange(sIdx, 'order', parseInt(e.target.value))}
                className="p-1.5 border border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                {Array.from({ length: stepsList.length }).map((_, i) => (
                  <option key={i} value={i + 1}>Step {i + 1}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="e.g., Turn off the main gas valve"
                value={step.text}
                onChange={(e) => handleStepChange(sIdx, 'text', e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-sm font-medium placeholder:text-slate-400 transition-colors"
              />
            </div>
            <button 
              type="button"
              onClick={() => removeStep(sIdx)}
              className="pt-2.5 text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-30"
              disabled={stepsList.length <= 2}
            >
              Remove
            </button>
          </div>
        ))}
        {formErrors.situationalSequence && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.situationalSequence}</p>}
      </div>
      <div className="flex justify-end pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => addSituationalScenarioToStep(formErrors)}
          className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-white shadow-sm hover:bg-slate-900 transition-colors uppercase tracking-wide"
        >
          + Add Scenario to Step
        </button>
      </div>
    </div>
  );
}
