import { useState } from "react";
import toast from "react-hot-toast";
import PriorityActionEditor from "./PriorityActionEditor";
import HazardIdentificationEditor from "./HazardIdentificationEditor";
import ActionSequenceEditor from "./ActionSequenceEditor";
import ConfirmationModal from "../../../../../components/ui/modals/ConfirmationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit01Icon, Delete01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";

export default function SituationalEditor({
  currentFlowStep,
  setCurrentFlowStep,
  currentSituationalData,
  setCurrentSituationalData,
  situationalImage,
  setSituationalImage,
  addSituationalScenarioToStep,
  formErrors,
  setFormErrors
}) {
  const [scenarioToDelete, setScenarioToDelete] = useState(null);

  const handleScenarioChange = (field, value) => {
    setCurrentSituationalData({ ...currentSituationalData, [field]: value });
    if (formErrors[field] || formErrors.scenarioDescription) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.scenarioDescription;
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEditScenario = (id) => {
    const scenario = currentFlowStep.situationalScenarios.find(s => s.id === id);
    if (scenario) {
      setCurrentSituationalData(scenario);
      const filtered = currentFlowStep.situationalScenarios.filter(s => s.id !== id);
      setCurrentFlowStep({ ...currentFlowStep, situationalScenarios: filtered });
    }
  };

  const confirmDeleteScenario = () => {
    if (scenarioToDelete) {
      const filtered = currentFlowStep.situationalScenarios.filter(s => s.id !== scenarioToDelete);
      setCurrentFlowStep({ ...currentFlowStep, situationalScenarios: filtered });
      setScenarioToDelete(null);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {formErrors.stepScenario && (
        <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded border border-red-100">
          {formErrors.stepScenario}
        </p>
      )}

      {currentFlowStep.situationalScenarios?.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 mb-4">
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide px-1">
            Added Scenarios ({currentFlowStep.situationalScenarios.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {currentFlowStep.situationalScenarios.map((scenario, idx) => (
              <div key={scenario.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm group">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs font-bold text-slate-800 truncate">Scenario {idx + 1}: {scenario.interactionType.replace('_', ' ')}</p>
                  <p className="text-xs text-slate-500 truncate">{scenario.scenarioDescription}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditScenario(scenario.id)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                  >
                    <HugeiconsIcon icon={Edit01Icon} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setScenarioToDelete(scenario.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <HugeiconsIcon icon={Delete01Icon} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100">
        <textarea 
          rows="4" 
          placeholder="Describe crisis scenario circumstances..." 
          value={currentSituationalData.scenarioDescription} 
          onChange={(e) => handleScenarioChange('scenarioDescription', e.target.value)} 
          className={`w-full p-3 bg-white border ${formErrors.scenarioDescription ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-300'} rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 shadow-sm resize-none transition-all`} 
        />
        {formErrors.scenarioDescription && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.scenarioDescription}</p>}
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
          addSituationalScenarioToStep={addSituationalScenarioToStep}
        />
      )}

      {currentSituationalData?.interactionType === "hazard_identification" && (
        <HazardIdentificationEditor 
          currentSituationalData={currentSituationalData}
          setCurrentSituationalData={setCurrentSituationalData}
          formErrors={formErrors}
          addSituationalScenarioToStep={addSituationalScenarioToStep}
        />
      )}

      {currentSituationalData?.interactionType === "action_sequence" && (
        <ActionSequenceEditor 
          currentSituationalData={currentSituationalData}
          setCurrentSituationalData={setCurrentSituationalData}
          formErrors={formErrors}
          addSituationalScenarioToStep={addSituationalScenarioToStep}
        />
      )}



      <ConfirmationModal
        isOpen={!!scenarioToDelete}
        onClose={() => setScenarioToDelete(null)}
        onConfirm={confirmDeleteScenario}
        title="Delete Scenario"
        description="Are you sure you want to remove this scenario from the step?"
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
