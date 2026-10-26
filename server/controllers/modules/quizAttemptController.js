const QuizAttemptService = require("../../services/modules/QuizAttemptService");
const { formatCompletionResult } = require("./moduleProgressController");
const { ADMIN_ROLES } = require("../../config/permissions");

const KNOWN_ERRORS = {
  NOT_FOUND: [404, "Assessment not found."],
  NOT_ENROLLED: [403, "You are not enrolled in this module."],
  NOT_ATTEMPT_STEP: [400, "This step is not a final assessment."],
  ATTEMPT_CLOSED: [409, "This attempt has already ended. Start the assessment again."],
  WRONG_QUESTION: [409, "That question is no longer the current one."],
  ALREADY_ANSWERED: [409, "This question has already been answered."],
  NOT_ANSWERED: [409, "Answer the current question first."],
  NO_NEXT_QUESTION: [409, "This is the last question. Submit the assessment instead."],
  NOT_FINISHED: [409, "Finish every question before submitting."],
  MODULE_HAS_NO_STEPS: [400, "This module has no steps and cannot be completed. Please contact your administrator."],
};

const parseId = (value) => {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    const known = KNOWN_ERRORS[error.message];
    if (known) {
      return res.status(known[0]).json({ success: false, error: error.message, message: known[1] });
    }
    console.error("Quiz attempt error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const invalidId = (res) => res.status(400).json({ success: false, message: "Invalid identifier." });

// @desc    Start or resume the learner's attempt at a final assessment
// @access  Private (enrolled learners; admins may preview unpublished modules)
exports.startAttempt = handle(async (req, res) => {
  const modId = parseId(req.params.id);
  const stepId = parseId(req.params.stepId);
  if (!modId || !stepId) return invalidId(res);

  const data = await QuizAttemptService.startOrResume(req.user.id, modId, stepId, {
    isAdmin: ADMIN_ROLES.includes(req.user.role),
  });
  return res.json({ success: true, data });
});

// @desc    Lock in an answer to the current question and receive its feedback
// @access  Private (attempt owner)
exports.answerQuestion = handle(async (req, res) => {
  const attemptId = parseId(req.params.attemptId);
  const questionId = parseId(req.body?.questionId);
  if (!attemptId || !questionId) return invalidId(res);

  const data = await QuizAttemptService.answer(req.user.id, attemptId, questionId, req.body?.selectedChoiceIds);
  return res.json({ success: true, data });
});

// @desc    Move to the next question (starts its clock)
// @access  Private (attempt owner)
exports.nextQuestion = handle(async (req, res) => {
  const attemptId = parseId(req.params.attemptId);
  if (!attemptId) return invalidId(res);

  const fromIndex = Number.isInteger(req.body?.fromIndex) ? req.body.fromIndex : undefined;
  const data = await QuizAttemptService.next(req.user.id, attemptId, fromIndex);
  return res.json({ success: true, data });
});

// @desc    Record that the learner left the browser tab during the attempt
// @access  Private (attempt owner)
exports.reportTabSwitch = handle(async (req, res) => {
  const attemptId = parseId(req.params.attemptId);
  if (!attemptId) return invalidId(res);

  const data = await QuizAttemptService.reportTabSwitch(req.user.id, attemptId);
  return res.json({ success: true, data });
});

// @desc    Grade the recorded answers and complete the step
// @access  Private (attempt owner)
exports.submitAttempt = handle(async (req, res) => {
  const attemptId = parseId(req.params.attemptId);
  if (!attemptId) return invalidId(res);

  const result = await QuizAttemptService.submit(req.user.id, attemptId);
  return res.json(formatCompletionResult(result));
});
