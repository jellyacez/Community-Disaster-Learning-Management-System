/**
 * Application-wide constants
 */

module.exports = {
  // Certificate settings
  RECERTIFICATION_INTERVAL_YEARS: 1,

  // Data Privacy Consent version
  CONSENT_VERSION: "v1-2026",

  // Step types graded against an answer key
  GRADED_STEP_TYPES: [
    "quiz",
    "situational",
    "priority_action",
    "hazard_identification",
    "action_sequence",
  ],

  // How a situational question is answered; matches the questions_interaction_type_check constraint
  INTERACTION_TYPES: ["priority_action", "hazard_identification", "action_sequence"],

  // Quiz settings
  QUIZ_QUESTION_SECONDS: 20,
  QUIZ_ANSWER_GRACE_SECONDS: 3,
  QUIZ_ATTEMPT_MAX_AGE_HOURS: 24,
  QUIZ_TAB_SWITCH_LIMIT: 2,
};
