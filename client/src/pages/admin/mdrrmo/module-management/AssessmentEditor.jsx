import QuizEditor from "./step-components/QuizEditor";
import SituationalEditor from "./step-components/SituationalEditor";

export default function AssessmentEditor({
  currentFlowStep,
  setCurrentFlowStep,
  currentQuizQuestion,
  setCurrentQuizQuestion,
  currentSituationalData,
  setCurrentSituationalData,
  addQuizQuestionToStep,
  addSituationalScenarioToStep,
  situationalImage,
  setSituationalImage,
  formErrors = {},
  setFormErrors,
}) {
  const handleStepChange = (field, value) => {
    setCurrentFlowStep({ ...currentFlowStep, [field]: value });
  };

  return (
    <div className="space-y-4 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 3. Formative Assessment Checkbox */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          Assessment Configuration
        </h4>
        <div className="flex items-center space-x-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
          <input
            type="checkbox"
            id="is_final_assessment"
            checked={currentFlowStep.is_final_assessment || false}
            onChange={(e) =>
              handleStepChange("is_final_assessment", e.target.checked)
            }
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-red-300 rounded cursor-pointer"
          />
          <label
            htmlFor="is_final_assessment"
            className="text-xs font-black text-red-800 cursor-pointer select-none"
          >
            Mark as Final Assessment
          </label>
        </div>
      </div>

      {currentFlowStep.builderStepType === "quiz" && (
        <QuizEditor
          currentFlowStep={currentFlowStep}
          setCurrentFlowStep={setCurrentFlowStep}
          currentQuizQuestion={currentQuizQuestion}
          setCurrentQuizQuestion={setCurrentQuizQuestion}
          addQuizQuestionToStep={addQuizQuestionToStep}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
        />
      )}

      {currentFlowStep.builderStepType === "situational" && (
        <SituationalEditor
          currentFlowStep={currentFlowStep}
          setCurrentFlowStep={setCurrentFlowStep}
          currentSituationalData={currentSituationalData}
          setCurrentSituationalData={setCurrentSituationalData}
          addSituationalScenarioToStep={addSituationalScenarioToStep}
          situationalImage={situationalImage}
          setSituationalImage={setSituationalImage}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
        />
      )}
    </div>
  );
}
