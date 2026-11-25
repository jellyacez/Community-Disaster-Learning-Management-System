const Joi = require("joi");
const { GRADED_STEP_TYPES, INTERACTION_TYPES } = require("../config/constants");

/** Returns { isValid, error }. */
exports.validateModuleCreation = (payload) => {
  if (!payload) return { isValid: false, error: "Payload is empty." };

  if (typeof payload.moduleName !== "string" || payload.moduleName.trim() === "") {
    return { isValid: false, error: "Module name is required and must be a string." };
  }

  if (typeof payload.moduleCategory !== "string" || payload.moduleCategory.trim() === "") {
    return { isValid: false, error: "Module category is required." };
  }

  if (typeof payload.level !== "string" || payload.level.trim() === "") {
    return { isValid: false, error: "Module level is required." };
  }

  if (typeof payload.duration !== "string" || payload.duration.trim() === "") {
    return { isValid: false, error: "Module duration is required." };
  }

  if (payload.training_hours !== undefined && (isNaN(Number(payload.training_hours)) || Number(payload.training_hours) <= 0)) {
    return { isValid: false, error: "Training hours must be a positive number." };
  }

  if (
    typeof payload.description !== "string" ||
    payload.description.trim() === "" ||
    payload.description === "<p></p>"
  ) {
    return { isValid: false, error: "Module description is required." };
  }

  // Authors can only save a draft or submit for review; publishing goes through the review endpoint
  if (payload.status !== undefined && !["draft", "pending_review"].includes(payload.status)) {
    return { isValid: false, error: "Status must be 'draft' or 'pending_review'." };
  }

  const validateUrl = (urlString, fieldName, requireImageExtension = false) => {
    if (!urlString || typeof urlString !== "string" || urlString.trim() === "") return null;
    try {
      const url = new URL(urlString);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return `${fieldName} must be a valid HTTP or HTTPS link.`;
      }

      if (requireImageExtension) {
        const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
        const pathname = url.pathname.toLowerCase();
        const hasValidExtension = imageExtensions.some((ext) => pathname.endsWith(ext));

        if (!hasValidExtension) {
          return `${fieldName} must point directly to an image file (.jpg, .png, .webp, etc).`;
        }
      }
      return null;
    } catch {
      return `${fieldName} format is invalid.`;
    }
  };

  const imageError = validateUrl(payload.image_url, "Thumbnail URL", true);
  if (imageError) return { isValid: false, error: imageError };

  const videoError = validateUrl(payload.video_url, "Video URL", false);
  if (videoError) return { isValid: false, error: videoError };

  // Level covers come from FileReader.readAsDataURL on an image/* picker (SequenceCanvas.jsx)
  const validateCover = (value, fieldName) =>
    typeof value === "string" && value.startsWith("data:")
      ? /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/]*={0,2}$/i.test(value)
        ? null
        : `${fieldName} must be an image data URL or an HTTP or HTTPS link.`
      : validateUrl(value, fieldName);

  if (!Array.isArray(payload.levels) || payload.levels.length === 0) {
    return { isValid: false, error: "At least one level is required." };
  }

  for (let i = 0; i < payload.levels.length; i++) {
    const level = payload.levels[i];

    if (typeof level.levelTitle !== "string" || level.levelTitle.trim() === "") {
      return { isValid: false, error: `Level ${i + 1} is missing a valid title.` };
    }

    const coverError =
      validateCover(level.cover_image, `Level ${i + 1} cover image`) ||
      validateCover(level.coverImage, `Level ${i + 1} cover image`);
    if (coverError) return { isValid: false, error: coverError };

    if (!Array.isArray(level.steps) || level.steps.length === 0) {
      return { isValid: false, error: `Level ${i + 1} must contain at least one step.` };
    }

    for (let j = 0; j < level.steps.length; j++) {
      const step = level.steps[j];

      if (typeof step.stepTitle !== "string" || step.stepTitle.trim() === "") {
        return { isValid: false, error: `Step ${j + 1} in Level ${i + 1} is missing a title.` };
      }

      if (typeof step.stepType !== "string" || step.stepType.trim() === "") {
        return { isValid: false, error: `Step ${j + 1} in Level ${i + 1} is missing a step type.` };
      }

      const mediaError = validateUrl(step.mediaUrl, `Step ${j + 1} in Level ${i + 1} media URL`);
      if (mediaError) return { isValid: false, error: mediaError };

      // ModuleService inserts quizQuestions for any step type, not only graded ones
      if (Array.isArray(step.quizQuestions)) {
        for (const q of step.quizQuestions) {
          const questionImageError = validateUrl(q?.imageURL, `A question image in '${step.stepTitle}'`);
          if (questionImageError) return { isValid: false, error: questionImageError };
        }
      }

      // Every graded type, situational included: an update replaces all questions, so an empty step would wipe them
      if (GRADED_STEP_TYPES.includes(step.stepType)) {
        if (!Array.isArray(step.quizQuestions) || step.quizQuestions.length === 0) {
          return { isValid: false, error: `Assessment step '${step.stepTitle}' must contain at least one question.` };
        }

        for (const q of step.quizQuestions) {
          if (typeof q.questionText !== "string" || q.questionText.trim() === "") {
            return { isValid: false, error: `A question in '${step.stepTitle}' is missing text.` };
          }
          if (!Array.isArray(q.options) || q.options.length === 0) {
            return { isValid: false, error: `A question in '${step.stepTitle}' must have options.` };
          }
          if (q.interactionType != null && !INTERACTION_TYPES.includes(q.interactionType)) {
            return { isValid: false, error: `A question in '${step.stepTitle}' has an invalid interaction type.` };
          }
          if (q.rationale != null && typeof q.rationale !== "string") {
            return { isValid: false, error: `A question in '${step.stepTitle}' has an invalid explanation.` };
          }
        }
      }
    }
  }

  return { isValid: true, error: null };
};


// How long an urgent advisory stays in effect (pinned) unless an admin lifts it sooner
const URGENT_DURATION_HOURS = [6, 12, 24, 48, 72];
const DEFAULT_URGENT_HOURS = 24;

const announcementSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required().messages({
    "string.empty": "Title cannot be empty.",
    "string.max": "Title must be 255 characters or fewer.",
  }),
  content: Joi.string().trim().min(1).required().messages({
    "string.empty": "Content cannot be empty.",
  }),
  priority: Joi.string().valid("standard", "urgent").default("standard"),
  duration_hours: Joi.number().valid(...URGENT_DURATION_HOURS).allow(null),
  // MDRRMO/system admins may target one barangay; listed so validate()'s stripUnknown keeps it.
  // The controller ignores it for barangay admins, who always post to their own barangay.
  target_barangay_id: Joi.number().integer().positive().allow(null, ""),
});

exports.announcementSchema = announcementSchema;
exports.URGENT_DURATION_HOURS = URGENT_DURATION_HOURS;
exports.DEFAULT_URGENT_HOURS = DEFAULT_URGENT_HOURS;

// Feedback text limits. Counted as stored: JS string length after sanitizeMiddleware stripped any
// HTML, which is never longer than what was typed unless the text decodes into markup.
const FEEDBACK_MAX_LENGTH = { subject: 255, message: 5000, reply: 5000 };
const FEEDBACK_LABELS = { subject: "Subject", message: "Message", reply: "Reply" };

/** The 400 message for the first of `fields` in `body` over its limit, or null. Other checks stay with the caller. */
exports.feedbackLengthError = (body, fields) => {
  const field = fields.find((f) => typeof body[f] === "string" && body[f].length > FEEDBACK_MAX_LENGTH[f]);
  return field ? `${FEEDBACK_LABELS[field]} must be ${FEEDBACK_MAX_LENGTH[field]} characters or fewer.` : null;
};
