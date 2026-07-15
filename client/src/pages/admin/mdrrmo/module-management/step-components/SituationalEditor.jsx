import toast from "react-hot-toast";
import PriorityActionEditor from "./PriorityActionEditor";
import HazardIdentificationEditor from "./HazardIdentificationEditor";
import ActionSequenceEditor from "./ActionSequenceEditor";

export default function SituationalEditor({
  currentFlowStep,
  setCurrentFlowStep,
  currentSituationalData,
  setCurrentSituationalData,
  situationalImage,
  setSituationalImage,
  formErrors,
  setFormErrors
}) {
  const handleStepChange = (field, value) => {
    setCurrentFlowStep({ ...currentFlowStep, [field]: value });
    if (formErrors[field] || formErrors.stepScenario) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        if (field === 'situationalScenario') delete newErrors.stepScenario;
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div>
        <textarea 
          rows="4" 
          placeholder="Describe crisis scenario circumstances..." 
          value={currentFlowStep.situationalScenario} 
          onChange={(e) => handleStepChange('situationalScenario', e.target.value)} 
          className={`w-full p-3 bg-white border ${formErrors.stepScenario ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-300'} rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 shadow-sm resize-none transition-all`} 
        />
        {formErrors.stepScenario && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.stepScenario}</p>}
      </div>
      <div className="flex flex-col gap-2.5 bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Upload Attachment Reference Picture</span>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => {
            const targetFile = e.target.files[0];
            if(targetFile) {
              setSituationalImage(targetFile);
              toast.success(`Asset assigned successfully: ${targetFile.name}`);
            }
          }}
          className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-bold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer transition-colors" 
        />
        {situationalImage && (
          <p className="text-xs text-emerald-600 font-bold mt-1 bg-emerald-50 p-2 rounded border border-emerald-100">
            Current Asset: {situationalImage.name || 'External URL Reference'}
          </p>
        )}
      </div>
      
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
          Scenario Interaction Type
        </label>
        <select 
          value={currentSituationalData?.interactionType || "priority_action"} 
          onChange={(e) => setCurrentSituationalData({ ...currentSituationalData, interactionType: e.target.value })} 
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all cursor-pointer"
        >
          <option value="priority_action">Option A: Priority Action (1 Correct Action)</option>
          <option value="hazard_identification">Option B: Hazard Identification (Multiple Select)</option>
          <option value="action_sequence">Option C: Action Sequence (Ordering)</option>
        </select>
      </div>

      {currentSituationalData?.interactionType === "priority_action" && (
        <PriorityActionEditor 
          currentSituationalData={currentSituationalData}
          setCurrentSituationalData={setCurrentSituationalData}
          formErrors={formErrors}
        />
      )}

      {currentSituationalData?.interactionType === "hazard_identification" && (
        <HazardIdentificationEditor 
          currentSituationalData={currentSituationalData}
          setCurrentSituationalData={setCurrentSituationalData}
          formErrors={formErrors}
        />
      )}

      {currentSituationalData?.interactionType === "action_sequence" && (
        <ActionSequenceEditor 
          currentSituationalData={currentSituationalData}
          setCurrentSituationalData={setCurrentSituationalData}
          formErrors={formErrors}
        />
      )}
    </div>
  );
}
