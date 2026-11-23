// Same rule as the server's LESSONS_INCOMPLETE check (QuizAttemptService): every step before
// `stepId` in the module version, by level order then step order, must be completed.
// Returns those steps that aren't, in order. Ids compare as strings (offline rows may differ).
export function earlierIncompleteSteps(levels, completedStepIds, stepId) {
  const done = new Set((completedStepIds || []).map(String));
  const ordered = [...(levels || [])]
    .sort((a, b) => a.level_order - b.level_order)
    .flatMap((level) => [...(level.steps || [])].sort((a, b) => a.step_order - b.step_order));
  const index = ordered.findIndex((s) => String(s.id) === String(stepId));
  if (index < 0) return [];
  return ordered.slice(0, index).filter((s) => !done.has(String(s.id)));
}
