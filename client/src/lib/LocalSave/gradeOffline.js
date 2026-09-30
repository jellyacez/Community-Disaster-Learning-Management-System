/**
 * Provisional offline quiz grading. Mirrors ModuleProgressService.completeModuleStep
 * on the server. The server re-grades the queued answers on sync and stays authoritative.
 *
 * @param {Array} questions Cached assessment questions for the step
 * @param {Array} answers [{ questionId, selectedChoiceIds }]
 * @param {number} passingThreshold Level passing threshold (percent)
 */
export function gradeQuizOffline(questions, answers, passingThreshold = 80) {
  let score = 0;
  let totalPoints = 0;

  for (const q of questions) {
    const qId = q.question_id ?? q.id;
    const points = q.points || 1;
    totalPoints += points;

    const answer = (answers || []).find((a) => a.questionId === qId);
    if (!answer) continue;

    const submitted = answer.selectedChoiceIds || [];
    const correct = (q.options || []).filter((o) => o.isCorrect);
    const sequenced = correct.filter((o) => (o.sequenceOrder ?? o.sequence_order) > 0);

    let isCorrect;
    if (sequenced.length > 0) {
      const expected = [...sequenced]
        .sort((a, b) => (a.sequenceOrder ?? a.sequence_order) - (b.sequenceOrder ?? b.sequence_order))
        .map((o) => o.id);
      isCorrect = JSON.stringify(expected) === JSON.stringify(submitted);
    } else if (correct.length > 1) {
      const expected = correct.map((o) => o.id).sort((a, b) => a - b);
      isCorrect = JSON.stringify(expected) === JSON.stringify([...submitted].sort((a, b) => a - b));
    } else {
      isCorrect = correct.length > 0 && submitted.length > 0 && correct[0].id === submitted[0];
    }

    if (isCorrect) score += points;
  }

  const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 100;
  return { passed: percentage >= (passingThreshold || 80), score, totalPoints, percentage };
}
