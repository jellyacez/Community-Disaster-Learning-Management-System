import { useState, useEffect } from "react";
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
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(true);
  const [isInteractionOpen, setIsInteractionOpen] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [isCommitOpen, setIsCommitOpen] = useState(true);

  useEffect(() => {
    if (formErrors.scenarioDescription || formErrors.situationalOptions || formErrors.situationalHazards || formErrors.situationalSequence) {
      const timer = setTimeout(() => {
        const targetId = formErrors.scenarioDescription ? "scenario-desc-anchor" : "scenario-config-anchor";
        const errorEl = document.getElementById(targetId);
        if (errorEl) {
          if (formErrors.scenarioDescription) setIsDescriptionOpen(true);
          if (formErrors.situationalOptions || formErrors.situationalHazards || formErrors.situationalSequence) setIsConfigOpen(true);
          
          errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [formErrors.scenarioDescription, formErrors.situationalOptions, formErrors.situationalHazards, formErrors.situationalSequence]);

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


      {/* Scenario Description Accordion */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
        <button 
          type="button" 
          onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">1. Scenario Description & Assets</span>
          <span className="text-slate-400 font-bold">{isDescriptionOpen ? '−' : '+'}</span>
        </button>
        {isDescriptionOpen && (
          <div className="p-4 border-t border-slate-200 space-y-4">
            <div>
              <textarea 
                id="scenario-desc-anchor"
                rows="4" 
                placeholder="Describe crisis scenario circumstances..." 
                value={currentSituationalData.scenarioDescription} 
                onChange={(e) => handleScenarioChange('scenarioDescription', e.target.value)} 
                className={`w-full p-3 bg-white border ${formErrors.scenarioDescription ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-300'} rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 shadow-sm resize-none transition-all`} 
              />
              {formErrors.scenarioDescription && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.scenarioDescription}</p>}
            </div>
            
            <div className="flex flex-col gap-2.5 bg-slate-50 p-4 border border-slate-200 rounded-xl shadow-sm">
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
                className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-bold file:bg-white file:text-slate-700 hover:file:bg-slate-100 cursor-pointer transition-colors" 
              />
              {situationalImage && (
                <p className="text-xs text-emerald-600 font-bold mt-1 bg-emerald-50 p-2 rounded border border-emerald-100">
                  Current Asset: {situationalImage.name || 'External URL Reference'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scenario Interaction Type Accordion */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
        <button 
          type="button" 
          onClick={() => setIsInteractionOpen(!isInteractionOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">2. Scenario Interaction Type</span>
          <span className="text-slate-400 font-bold">{isInteractionOpen ? '−' : '+'}</span>
        </button>
        {isInteractionOpen && (
          <div className="p-4 border-t border-slate-200">
            <select 
              value={currentSituationalData?.interactionType || "priority_action"} 
              onChange={(e) => setCurrentSituationalData({ ...currentSituationalData, interactionType: e.target.value })} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all cursor-pointer"
            >
              <option value="priority_action">Priority Action (1 Correct Action)</option>
              <option value="hazard_identification">Hazard Identification (Multiple Select)</option>
              <option value="action_sequence">Action Sequence (Ordering)</option>
            </select>
          </div>
        )}
      </div>

      {/* Answers & Config Accordion */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
        <button 
          type="button" 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">3. Answers & Config</span>
          <span className="text-slate-400 font-bold">{isConfigOpen ? '−' : '+'}</span>
        </button>
        {isConfigOpen && (
          <div className="p-4 border-t border-slate-200" id="scenario-config-anchor">
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
        )}
      </div>

      {/* Assessment Config Accordion */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
        <button 
          type="button" 
          onClick={() => setIsCommitOpen(!isCommitOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">4. Assessment Config</span>
          <span className="text-slate-400 font-bold">{isCommitOpen ? '−' : '+'}</span>
        </button>
        {isCommitOpen && (
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => addSituationalScenarioToStep(formErrors)}
                className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-white shadow-sm hover:bg-slate-900 transition-colors uppercase tracking-wide"
              >
                + Add Scenario to Step
              </button>
            </div>
          </div>
        )}
      </div>



      {/* Render saved scenarios for this step */}
      {currentFlowStep.situationalScenarios?.length > 0 && (
        <div className="mt-4 bg-white p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-sm">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">
            Committed Scenarios ({currentFlowStep.situationalScenarios.length})
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {currentFlowStep.situationalScenarios.map((scenario, idx) => (
              <div key={scenario.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-emerald-100 rounded-lg shadow-sm group">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs font-bold text-slate-800 truncate">Scenario {idx + 1}: {scenario.interactionType.replace('_', ' ')}</p>
                  <p className="text-xs text-slate-500 truncate">{scenario.scenarioDescription}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditScenario(scenario.id)}
                    className="px-2.5 py-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded uppercase tracking-wide transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setScenarioToDelete(scenario.id)}
                    className="px-2.5 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded uppercase tracking-wide transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
