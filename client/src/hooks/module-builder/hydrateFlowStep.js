import { decodeHtml } from "../../utils/textUtils.js";

const SITUATIONAL_TYPES = ["situational", "priority_action", "hazard_identification", "action_sequence"];

const blankOptions = () => [
  { text: "", rationale: "" },
  { text: "", rationale: "" },
  { text: "", rationale: "" },
  { text: "", rationale: "" },
];

// Older questions have no stored interaction type; infer it the same way the player and grader do
function inferInteractionType(options) {
  if (options.some((o) => o.sequence_order > 0)) return "action_sequence";
  if (options.filter((o) => o.isCorrect).length > 1) return "hazard_identification";
  return "priority_action";
}

// Rebuilds a saved situational question into the builder's scenario shape, so re-saving keeps it
function toScenario(q, index) {
  const options = (q.options || []).map((opt) => ({
    text: decodeHtml(opt.text) || "",
    rationale: decodeHtml(opt.rationale) || "",
    isCorrect: opt.isCorrect || false,
    sequence_order: opt.sequence_order,
  }));
  const interactionType = q.interactionType || inferInteractionType(options);
  const correctIdx = options.findIndex((o) => o.isCorrect);

  return {
    id: `scenario-${q.id ?? index}`,
    scenarioDescription: decodeHtml(q.questionText) || "",
    interactionType,
    rationale: decodeHtml(q.rationale) || "",
    options: interactionType === "priority_action"
      ? options.map(({ text, rationale, isCorrect }) => ({ text, rationale, isCorrect }))
      : blankOptions(),
    correctAnswerIndex: interactionType === "priority_action" && correctIdx >= 0 ? correctIdx : 0,
    hazards: interactionType === "hazard_identification"
      ? options.map(({ text, rationale, isCorrect }) => ({ text, rationale, isRequired: isCorrect }))
      : [{ text: "", rationale: "", isRequired: true }],
    sequenceSteps: interactionType === "action_sequence"
      ? options
          .filter((o) => o.sequence_order > 0)
          .sort((a, b) => a.sequence_order - b.sequence_order)
          .map((o) => ({ text: o.text, order: o.sequence_order }))
      : [{ text: "", order: 1 }],
  };
}

// Maps a step from /modules/:id/edit-details into a staged builder flow
export function hydrateFlowStep(step, levelOrder) {
  const type = step.stepType || step.step_type || "text";
  const questions = step.quizQuestions || [];
  const isSituational = SITUATIONAL_TYPES.includes(type);

  const flow = {
    id: `step-${levelOrder}-${step.stepOrder || step.step_order}-${Date.now()}-${Math.random()}`,
    levelOrder,
    builderStepType: type === "quiz" ? "quiz" : isSituational ? "situational" : "learning_material",
    title: decodeHtml(step.stepTitle || step.step_title) || "",
    type,
    textContent: type === "text" ? (step.stepContent || step.step_content || "") : "",
    mediaUrl: step.mediaUrl || step.media_url || "",
    finalMediaUrl: step.mediaUrl || step.media_url || "",
    is_final_assessment: step.is_final_assessment || false,
    assessmentType: isSituational ? "situational" : "quiz",
    quizQuestions: [],
    situationalScenarios: [],
  };

  if (isSituational) {
    flow.situationalScenarios = questions.map(toScenario);
  } else {
    flow.quizQuestions = questions.map((q) => {
      const correctIdx = (q.options || []).findIndex((opt) => opt.isCorrect);
      return {
        questionText: decodeHtml(q.questionText) || "",
        correctAnswerIndex: correctIdx >= 0 ? correctIdx : 0,
        options: (q.options || []).map((opt) => ({
          text: decodeHtml(opt.text) || "",
          rationale: decodeHtml(opt.rationale) || "",
          isCorrect: opt.isCorrect || false,
          sequence_order: opt.sequence_order,
        })),
      };
    });
  }

  return flow;
}
