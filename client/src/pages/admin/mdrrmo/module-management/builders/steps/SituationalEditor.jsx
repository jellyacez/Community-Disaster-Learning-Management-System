import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import toast from "react-hot-toast";
import PriorityActionEditor from "./PriorityActionEditor";
import HazardIdentificationEditor from "./HazardIdentificationEditor";
import ActionSequenceEditor from "./ActionSequenceEditor";
import ConfirmationModal from "../../../../../../components/ui/modals/ConfirmationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Target01Icon,
  Alert01Icon,
  Menu01Icon,
} from "@hugeicons/core-free-icons";

import { scrollToFirstError } from "../../../../../../utils/scrollUtils";

export default function SituationalEditor({
  currentFlowStep,
  setCurrentFlowStep,
  currentSituationalData,
  setCurrentSituationalData,
  situationalImage,
  setSituationalImage,
  addSituationalScenarioToStep,
  formErrors,
  setFormErrors,
}) {
  const [scenarioToDelete, setScenarioToDelete] = useState(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(true);
  const [isInteractionOpen, setIsInteractionOpen] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [isCommitOpen, setIsCommitOpen] = useState(true);

  useEffect(() => {
    if (
      formErrors.scenarioDescription ||
      formErrors.situationalOptions ||
      formErrors.situationalHazards ||
      formErrors.situationalSequence
    ) {
      const timer = setTimeout(() => {
        flushSync(() => {
          if (formErrors.scenarioDescription) setIsDescriptionOpen(true);
          if (
            formErrors.situationalOptions ||
            formErrors.situationalHazards ||
            formErrors.situationalSequence
          ) {
            setIsInteractionOpen(true);
          }
        });

        const anchorIds = [];
        if (formErrors.scenarioDescription)
          anchorIds.push("situational-description-anchor");

        if (formErrors.situationalOptions) {
          for (let i = 0; i < 4; i++) {
            anchorIds.push(`situational-option-${i}-anchor`);
          }
        }

        if (formErrors.situationalHazards) {
          const count = currentSituationalData?.hazards?.length || 1;
          for (let i = 0; i < count; i++) {
            anchorIds.push(`situational-hazard-${i}-anchor`);
          }
        }

        if (formErrors.situationalSequence) {
          const count = currentSituationalData?.sequenceSteps?.length || 2;
          for (let i = 0; i < count; i++) {
            anchorIds.push(`situational-sequence-${i}-anchor`);
          }
        }

        setTimeout(() => {
          scrollToFirstError("step-builder-scroll-container", anchorIds);
        }, 50);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [formErrors._scrollTrigger]);

  const handleInteractionTypeChange = (type) => {
    setCurrentSituationalData({
      ...currentSituationalData,
      interactionType: type,
    });
  };

  const removeScenarioFromStep = (index) => {
    const updated = [...currentFlowStep.situationalScenarios];
    updated.splice(index, 1);
    setCurrentFlowStep({ ...currentFlowStep, situationalScenarios: updated });
    setScenarioToDelete(null);
  };

  const moveScenario = (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (
      targetIndex < 0 ||
      targetIndex >= currentFlowStep.situationalScenarios.length
    )
      return;
    const updated = [...currentFlowStep.situationalScenarios];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setCurrentFlowStep({ ...currentFlowStep, situationalScenarios: updated });
  };

  return (
    <div className="space-y-4 pt-2">
      {/* 1. Scenario Context & Description Accordion */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button
          type="button"
          onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            1. Scenario Prompt & Scene
          </span>
          <span className="text-slate-400 font-bold">
            {isDescriptionOpen ? "−" : "+"}
          </span>
        </button>
        {isDescriptionOpen && (
          <div className="p-4 border-t border-slate-200 space-y-4 bg-slate-50">
            <div id="situational-description-anchor">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Scenario Prompt / Context <span className="text-red-500">*</span>
              </label>
              <textarea
                rows="3"
                value={currentSituationalData.scenarioDescription}
                onChange={(e) => {
                  setCurrentSituationalData({
                    ...currentSituationalData,
                    scenarioDescription: e.target.value,
                  });
                  if (formErrors.scenarioDescription) {
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.scenarioDescription;
                      return next;
                    });
                  }
                }}
                placeholder="Describe the unfolding crisis scene (e.g. Rising floodwaters trap several families on a rooftop with severed power lines nearby)..."
                className={`w-full p-3 bg-white border ${formErrors.scenarioDescription ? "border-red-500 ring-2 ring-red-500/10" : "border-slate-300"} rounded-xl text-sm font-medium focus:outline-none focus:border-red-500 transition-all placeholder:text-slate-400`}
              />
              {formErrors.scenarioDescription && (
                <p className="text-red-500 text-xs mt-1.5 font-bold">
                  {formErrors.scenarioDescription}
                </p>
              )}
            </div>

            {/* Scenario Scene Image Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Attach Scenario Illustration / Diagram (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setSituationalImage(file);
                    toast.success(`Image staged: ${file.name}`);
                  }
                }}
                className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-bold file:bg-white file:text-slate-700 hover:file:bg-slate-100 cursor-pointer transition-colors"
              />
              {situationalImage && (
                <div className="mt-2 flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-xs text-emerald-800 font-bold">
                    Staged: {situationalImage.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Interaction Mechanism Accordion */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button
          type="button"
          onClick={() => setIsInteractionOpen(!isInteractionOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            2. Scenario Interaction & Configuration
          </span>
          <span className="text-slate-400 font-bold">
            {isInteractionOpen ? "−" : "+"}
          </span>
        </button>
        {isInteractionOpen && (
          <div className="p-4 border-t border-slate-200 space-y-4 bg-slate-50">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Interaction Mechanics
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: "priority_action",
                    label: "Priority Action",
                    icon: Target01Icon,
                  },
                  {
                    id: "hazard_identification",
                    label: "Hazard ID",
                    icon: Alert01Icon,
                  },
                  {
                    id: "action_sequence",
                    label: "Action Sequence",
                    icon: Menu01Icon,
                  },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleInteractionTypeChange(type.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      currentSituationalData.interactionType === type.id
                        ? "bg-red-50 border-red-200 text-red-700 shadow-sm ring-1 ring-red-500"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70"
                    }`}
                  >
                    <HugeiconsIcon
                      icon={type.icon}
                      className={`w-4 h-4 ${currentSituationalData.interactionType === type.id ? "text-red-600" : "text-slate-400"}`}
                    />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Render Specific Interaction Sub-Editor */}
            {currentSituationalData.interactionType === "priority_action" && (
              <PriorityActionEditor
                currentSituationalData={currentSituationalData}
                setCurrentSituationalData={setCurrentSituationalData}
                formErrors={formErrors}
              />
            )}

            {currentSituationalData.interactionType ===
              "hazard_identification" && (
              <HazardIdentificationEditor
                currentSituationalData={currentSituationalData}
                setCurrentSituationalData={setCurrentSituationalData}
                formErrors={formErrors}
              />
            )}

            {currentSituationalData.interactionType === "action_sequence" && (
              <ActionSequenceEditor
                currentSituationalData={currentSituationalData}
                setCurrentSituationalData={setCurrentSituationalData}
                formErrors={formErrors}
              />
            )}
          </div>
        )}
      </div>

      {/* 3. Action Commit / Staging Trigger */}
      <div className="pt-2">
        <button
          type="button"
          onClick={addSituationalScenarioToStep}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition-all uppercase tracking-wide flex items-center justify-center gap-2"
        >
          <HugeiconsIcon icon={Target01Icon} className="w-4 h-4" />+ Stage
          Scenario into Assessment Step
        </button>
      </div>

      {/* 4. Staged Scenarios List */}
      {currentFlowStep.situationalScenarios?.length > 0 && (
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Staged Scenarios ({currentFlowStep.situationalScenarios.length})
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {currentFlowStep.situationalScenarios.map((s, idx) => (
              <div
                key={idx}
                className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-sm hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-bold text-red-600 shrink-0">
                    S{idx + 1}.
                  </span>
                  <p className="truncate font-medium text-slate-800">
                    {s.scenarioDescription}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveScenario(idx, "up")}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 transition-colors"
                  >
                    <HugeiconsIcon
                      icon={ArrowUp01Icon}
                      className="w-3.5 h-3.5"
                    />
                  </button>
                  <button
                    type="button"
                    disabled={
                      idx === currentFlowStep.situationalScenarios.length - 1
                    }
                    onClick={() => moveScenario(idx, "down")}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 transition-colors"
                  >
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      className="w-3.5 h-3.5"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setScenarioToDelete({
                        index: idx,
                        title: s.scenarioDescription,
                      })
                    }
                    className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors ml-1"
                  >
                    <HugeiconsIcon icon={Delete01Icon} className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Modal */}
      {scenarioToDelete && (
        <ConfirmationModal
          isOpen={true}
          title="Remove Scenario from Step"
          message={`Are you sure you want to discard Scenario ${scenarioToDelete.index + 1}: "${scenarioToDelete.title}"?`}
          confirmLabel="Remove"
          onConfirm={() => removeScenarioFromStep(scenarioToDelete.index)}
          onCancel={() => setScenarioToDelete(null)}
          type="danger"
        />
      )}
    </div>
  );
}
