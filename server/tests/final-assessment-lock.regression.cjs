/**
 * Regression test for the viewer's final-assessment lock (P4-02 follow-up F3).
 *
 * The client rule in client/src/utils/stepLocks.js must match the server's
 * (QuizAttemptService LESSONS_INCOMPLETE): a final is locked until every step before it in the
 * module version (all earlier levels, by level order then step order) is in completedStepIds.
 *
 *   a) a lesson in an earlier level blocks a final that is first in its level
 *   b) every earlier step complete: unlocked
 *   c) steps after the final aren't required
 *   d) ids compare as strings or numbers (offline rows), and input order doesn't matter
 *   e) an earlier final counts like any other step
 *
 * Pure function, no server or database. Run from the repo root:
 *   node server/tests/final-assessment-lock.regression.cjs
 */
const path = require("path");
const { pathToFileURL } = require("url");
const assert = require("assert/strict");

const step = (id, step_order, extra = {}) => ({ id, step_order, title: `Step ${id}`, ...extra });
const final = (id, step_order) => step(id, step_order, { is_final_assessment: true, type: "quiz" });

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`not ok - ${name}: ${err.message.split("\n")[0]}`);
  }
}

(async () => {
  const { earlierIncompleteSteps } = await import(
    pathToFileURL(path.join(__dirname, "../../client/src/utils/stepLocks.js")).href
  );
  const ids = (steps) => steps.map((s) => s.id);

  const twoLevels = [
    { id: 1, level_order: 1, steps: [step(10, 1), step(11, 2)] },
    { id: 2, level_order: 2, steps: [final(20, 1), step(21, 2)] },
  ];

  check("a) earlier-level lessons block a final that is first in its level", () => {
    assert.deepEqual(ids(earlierIncompleteSteps(twoLevels, [], 20)), [10, 11]);
    assert.deepEqual(ids(earlierIncompleteSteps(twoLevels, [10], 20)), [11]);
  });
  check("a) remaining steps carry their titles", () => {
    assert.deepEqual(earlierIncompleteSteps(twoLevels, [10], 20).map((s) => s.title), ["Step 11"]);
  });
  check("b) every earlier step complete: nothing remains", () => {
    assert.deepEqual(earlierIncompleteSteps(twoLevels, [10, 11], 20), []);
  });
  check("c) a step after the final isn't required", () => {
    assert.ok(!ids(earlierIncompleteSteps(twoLevels, [], 20)).includes(21));
  });
  check("d) string ids and unsorted levels/steps", () => {
    const shuffled = [
      { id: 2, level_order: 2, steps: [step(21, 2), final(20, 1)] },
      { id: 1, level_order: 1, steps: [step(11, 2), step(10, 1)] },
    ];
    assert.deepEqual(ids(earlierIncompleteSteps(shuffled, ["10"], "20")), [11]);
    assert.deepEqual(earlierIncompleteSteps(shuffled, ["10", "11"], 20), []);
  });
  check("e) an earlier final is a required step", () => {
    const levels = [{ id: 1, level_order: 1, steps: [step(1, 1), final(2, 2), final(3, 3)] }];
    assert.deepEqual(ids(earlierIncompleteSteps(levels, [1], 3)), [2]);
  });
  check("unknown step id: nothing remains", () => {
    assert.deepEqual(earlierIncompleteSteps(twoLevels, [], 999), []);
  });

  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exitCode = failed ? 1 : 0;
})().catch((err) => {
  console.error("FAIL:", err.message);
  process.exitCode = 1;
});
