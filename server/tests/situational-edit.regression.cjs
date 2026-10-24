/**
 * Regression test: editing a module wiped its situational questions.
 *
 * Loading a module for edit dropped each situational step's scenarios, so saving it again sent
 * the step with no questions, and the update (which deletes and re-inserts every question)
 * left learners with "No Questions Found" and a Bypass button.
 *
 * Asserts that:
 *   - the builder's edit hydration rebuilds situational steps into scenarios the submit path saves
 *   - the module validator rejects a situational step with no questions
 *
 * No server or database needed. Run from the repo root:
 *   node server/tests/situational-edit.regression.cjs
 */
const path = require("path");
const { pathToFileURL } = require("url");
const assert = require("assert/strict");
const { validateModuleCreation } = require("../utils/validators");

// A step as /modules/:id/edit-details returns it
const opt = (text, isCorrect, sequence_order = null) => ({ text, isCorrect, rationale: `why ${text}`, sequence_order });
const editDetailsStep = {
  stepOrder: 3,
  stepTitle: "YOU Respond to an Approaching Storm",
  stepType: "situational",
  is_final_assessment: false,
  quizQuestions: [
    { id: 1, questionText: "Priority", options: [opt("A", false), opt("B", true), opt("C", false), opt("D", false)] },
    { id: 2, questionText: "Hazards", options: [opt("Wire", true), opt("Tree", true), opt("Sky", false)] },
    { id: 3, questionText: "Sequence", options: [opt("Second", true, 2), opt("First", true, 1)] },
  ],
};

const payload = (step) => ({
  moduleName: "M",
  moduleCategory: "General",
  level: "Level 1",
  duration: "15 mins",
  description: "D",
  levels: [{ levelOrder: 1, levelTitle: "L1", steps: [step] }],
});

async function main() {
  const { hydrateFlowStep } = await import(
    pathToFileURL(path.join(__dirname, "../../client/src/hooks/module-builder/hydrateFlowStep.js")).href
  );

  const flow = hydrateFlowStep(editDetailsStep, 1);

  // useModuleSubmit only saves situational questions when both of these hold
  assert.equal(flow.assessmentType, "situational");
  assert.equal(flow.builderStepType, "situational");
  assert.equal(flow.situationalScenarios.length, 3);

  const [priority, hazards, sequence] = flow.situationalScenarios;
  assert.equal(priority.interactionType, "priority_action");
  assert.equal(priority.correctAnswerIndex, 1);
  assert.deepEqual(priority.options.map((o) => o.text), ["A", "B", "C", "D"]);

  assert.equal(hazards.interactionType, "hazard_identification");
  assert.deepEqual(hazards.hazards.map((h) => [h.text, h.isRequired]), [["Wire", true], ["Tree", true], ["Sky", false]]);

  assert.equal(sequence.interactionType, "action_sequence");
  assert.deepEqual(sequence.sequenceSteps, [{ text: "First", order: 1 }, { text: "Second", order: 2 }]);
  console.log("ok: edit hydration rebuilds situational scenarios");

  // Legacy per-type steps go through the same path
  const legacy = hydrateFlowStep({ ...editDetailsStep, stepType: "priority_action" }, 1);
  assert.equal(legacy.assessmentType, "situational");
  assert.equal(legacy.type, "priority_action");
  assert.equal(legacy.situationalScenarios.length, 3);
  console.log("ok: legacy situational step types hydrate as scenarios");

  // Quiz steps are unchanged
  const quiz = hydrateFlowStep({ ...editDetailsStep, stepType: "quiz" }, 1);
  assert.equal(quiz.builderStepType, "quiz");
  assert.equal(quiz.quizQuestions.length, 3);
  assert.equal(quiz.situationalScenarios.length, 0);
  console.log("ok: quiz steps still hydrate into quizQuestions");

  const empty = validateModuleCreation(payload({ stepTitle: "S", stepType: "situational", quizQuestions: [] }));
  assert.equal(empty.isValid, false);
  assert.match(empty.error, /at least one question/);
  console.log("ok: validator rejects a situational step with no questions");

  const filled = validateModuleCreation(payload({
    stepTitle: "S",
    stepType: "situational",
    quizQuestions: [{ questionText: "Q", options: [{ text: "A", isCorrect: true }] }],
  }));
  assert.equal(filled.isValid, true, filled.error);
  console.log("ok: validator accepts a situational step with questions");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
