import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import toast from "react-hot-toast";
import PriorityActionEditor from "./PriorityActionEditor";
import HazardIdentificationEditor from "./HazardIdentificationEditor";
import ActionSequenceEditor from "./ActionSequenceEditor";
import ConfirmationModal from "../../../../../components/ui/modals/ConfirmationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Target01Icon,
  Alert01Icon,
  Menu01Icon,
} from "@hugeicons/core-free-icons";

import { scrollToFirstError } from "../../../../../utils/scrollUtils";

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
          )
            setIsConfigOpen(true);
        });

        setTimeout(() => {
          const activeErrorIds = [];
          if (formErrors.scenarioDescription)
            activeErrorIds.push("scenario-desc-anchor");

          if (formErrors.situationalOptions && currentSituationalData.options) {
            currentSituationalData.options.forEach((opt, idx) => {
              if (!opt.text?.trim() || !opt.rationale?.trim()) {
                activeErrorIds.push(`situational-option-${idx}-anchor`);
              }
            });
          }

          if (formErrors.situationalHazards && currentSituationalData.hazards) {
            currentSituationalData.hazards.forEach((h, idx) => {
              if (!h.text?.trim() || !h.rationale?.trim()) {
                activeErrorIds.push(`situational-hazard-${idx}-anchor`);
              }
            });
          }

          if (
            formErrors.situationalSequence &&
            currentSituationalData.sequenceSteps
          ) {
            currentSituationalData.sequenceSteps.forEach((s, idx) => {
              if (!s.text?.trim()) {
                activeErrorIds.push(`situational-sequence-${idx}-anchor`);
              }
            });
          }

          scrollToFirstError("step-builder-scroll-container", activeErrorIds);
        }, 50);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [formErrors._scrollTrigger]);

  const handleScenarioChange = (field, value) => {
    setCurrentSituationalData({ ...currentSituationalData, [field]: value });
    if (formErrors[field] || formErrors.scenarioDescription) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.scenarioDescription;
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEditScenario = (id) => {
    const scenario = currentFlowStep.situationalScenarios.find(
      (s) => s.id === id,
    );
    if (scenario) {
      setCurrentSituationalData(scenario);
      const filtered = currentFlowStep.situationalScenarios.filter(
        (s) => s.id !== id,
      );
      setCurrentFlowStep({
        ...currentFlowStep,
        situationalScenarios: filtered,
      });
    }
  };

  const moveScenario = (index, direction) => {
    if (direction === "up" && index === 0) return;
    if (
      direction === "down" &&
      index === currentFlowStep.situationalScenarios.length - 1
    )
      return;

    const newScenarios = [...currentFlowStep.situationalScenarios];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const temp = newScenarios[index];
    newScenarios[index] = newScenarios[swapIndex];
    newScenarios[swapIndex] = temp;

    setCurrentFlowStep({
      ...currentFlowStep,
      situationalScenarios: newScenarios,
    });
  };

  const getInteractionIcon = (type) => {
    switch (type) {
      case "priority_action":
        return Target01Icon;
      case "hazard_identification":
        return Alert01Icon;
      case "action_sequence":
        return Menu01Icon;
      default:
        return Target01Icon;
    }
  };

  const confirmDeleteScenario = () => {
    if (scenarioToDelete) {
      const filtered = currentFlowStep.situationalScenarios.filter(
        (s) => s.id !== scenarioToDelete,
      );
      setCurrentFlowStep({
        ...currentFlowStep,
        situationalScenarios: filtered,
      });
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
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            1. Scenario Description & Assets
          </span>
          <span className="text-slate-400 font-bold">
            {isDescriptionOpen ? "−" : "+"}
          </span>
        </button>
        {isDescriptionOpen && (
          <div className="p-4 border-t border-slate-200 space-y-4">
            <div>
              <textarea
                id="scenario-desc-anchor"
                rows="4"
                placeholder="Describe crisis scenario circumstances..."
                value={currentSituationalData.scenarioDescription}
                onChange={(e) =>
                  handleScenarioChange("scenarioDescription", e.target.value)
                }
                className={`w-full p-3 bg-white border ${formErrors.scenarioDescription ? "border-red-500 ring-2 ring-red-500/10" : "border-slate-300"} rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 shadow-sm resize-none transition-all`}
              />
              {formErrors.scenarioDescription && (
                <p className="text-red-500 text-xs mt-1.5 font-bold">
                  {formErrors.scenarioDescription}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2.5 bg-slate-50 p-4 border border-slate-200 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Upload Attachment Reference Picture
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const targetFile = e.target.files[0];
                  if (targetFile) {
                    setSituationalImage(targetFile);
                    toast.success(
                      `Asset assigned successfully: ${targetFile.name}`,
                    );
                  }
                }}
                className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-bold file:bg-white file:text-slate-700 hover:file:bg-slate-100 cursor-pointer transition-colors"
              />
              {situationalImage && (
                <p className="text-xs text-emerald-600 font-bold mt-1 bg-emerald-50 p-2 rounded border border-emerald-100">
                  Current Asset:{" "}
                  {situationalImage.name || "External URL Reference"}
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
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            2. Scenario Interaction Type
          </span>
          <span className="text-slate-400 font-bold">
            {isInteractionOpen ? "−" : "+"}
          </span>
        </button>
        {isInteractionOpen && (
          <div className="p-4 border-t border-slate-200">
            <select
              value={
                currentSituationalData?.interactionType || "priority_action"
              }
              onChange={(e) =>
                setCurrentSituationalData({
                  ...currentSituationalData,
                  interactionType: e.target.value,
                })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all cursor-pointer"
            >
              <option value="priority_action">
                Priority Action (1 Correct Action)
              </option>
              <option value="hazard_identification">
                Hazard Identification (Multiple Select)
              </option>
              <option value="action_sequence">
                Action Sequence (Ordering)
              </option>
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
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            3. Answers & Config
          </span>
          <span className="text-slate-400 font-bold">
            {isConfigOpen ? "−" : "+"}
          </span>
        </button>
        {isConfigOpen && (
          <div
            className="p-4 border-t border-slate-200"
            id="scenario-config-anchor"
          >
            {currentSituationalData?.interactionType === "priority_action" && (
              <PriorityActionEditor
                currentSituationalData={currentSituationalData}
                setCurrentSituationalData={setCurrentSituationalData}
                formErrors={formErrors}
              />
            )}

            {currentSituationalData?.interactionType ===
              "hazard_identification" && (
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
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            4. Assessment Config
          </span>
          <span className="text-slate-400 font-bold">
            {isCommitOpen ? "−" : "+"}
          </span>
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
              <div
                key={scenario.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-emerald-100 rounded-lg shadow-sm group"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0 mr-3">
                  <span className="flex shrink-0 items-center justify-center w-6 h-6 rounded bg-emerald-50 text-emerald-600">
                    <HugeiconsIcon
                      icon={getInteractionIcon(scenario.interactionType)}
                      className="w-3.5 h-3.5"
                    />
                  </span>
                  <div className="flex-1 min-w-0 truncate">
                    <p
                      className="text-xs font-bold text-slate-800 truncate"
                      title={`Scenario ${idx + 1}: ${scenario.interactionType.replace("_", " ")}`}
                    >
                      Scenario {idx + 1}:{" "}
                      {scenario.interactionType.replace("_", " ")}
                    </p>
                    <p
                      className="text-xs text-slate-500 truncate"
                      title={scenario.scenarioDescription}
                    >
                      {scenario.scenarioDescription}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-0.5 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => moveScenario(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                      title="Move Up"
                    >
                      <HugeiconsIcon icon={ArrowUp01Icon} className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveScenario(idx, "down")}
                      disabled={
                        idx === currentFlowStep.situationalScenarios.length - 1
                      }
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                      title="Move Down"
                    >
                      <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        className="w-4 h-4"
                      />
                    </button>
                  </div>
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
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete Scenario"
                  >
                    <HugeiconsIcon icon={Delete01Icon} className="w-4 h-4" />
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
