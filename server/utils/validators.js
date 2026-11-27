const Joi = require("joi");
const { GRADED_STEP_TYPES, INTERACTION_TYPES } = require("../config/constants");
const { cleanRichText } = require("./sanitizeHtml");

// What the builder saves: its learning types, quiz, situational, and older steps that kept an interaction type as their step type
const STEP_TYPES = ["text", "video", "pdf", ...GRADED_STEP_TYPES];

// module_data.valid_modcat; the builder's category select offers exactly these
const MODULE_CATEGORIES = ["Fundamentals", "Flood", "Earthquake", "Fire", "General"];

// varchar sizes in schema.sql. Postgres counts characters, so an emoji is one, not two UTF-16 units
const MAX_URL_LENGTH = 500;
const MAX_TITLE_LENGTH = 255;
const tooLong = (value, max) => typeof value === "string" && [...value].length > max;

// Well above what an author builds by hand; the 800 KB body limit was the only bound before
const MAX_LEVELS = 50;
const MAX_STEPS_PER_LEVEL = 100;
const MAX_QUESTIONS_PER_STEP = 100;
const MAX_OPTIONS_PER_QUESTION = 30;

/** Returns { isValid, error }. */
exports.validateModuleCreation = (payload) => {
  if (!payload) return { isValid: false, error: "Payload is empty." };

  if (typeof payload.moduleName !== "string" || payload.moduleName.trim() === "") {
    return { isValid: false, error: "Module name is required and must be a string." };
  }
  if (tooLong(payload.moduleName, 500)) {
    return { isValid: false, error: "Module name must be 500 characters or fewer." };
  }

  if (typeof payload.moduleCategory !== "string" || payload.moduleCategory.trim() === "") {
    return { isValid: false, error: "Module category is required." };
  }
  if (!MODULE_CATEGORIES.includes(payload.moduleCategory)) {
    return { isValid: false, error: `Module category must be one of: ${MODULE_CATEGORIES.join(", ")}.` };
  }

  if (typeof payload.level !== "string" || payload.level.trim() === "") {
    return { isValid: false, error: "Module level is required." };
  }
  if (tooLong(payload.level, 50)) {
    return { isValid: false, error: "Module level must be 50 characters or fewer." };
  }

  if (typeof payload.duration !== "string" || payload.duration.trim() === "") {
    return { isValid: false, error: "Module duration is required." };
  }
  if (tooLong(payload.duration, 50)) {
    return { isValid: false, error: "Module duration must be 50 characters or fewer." };
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
  // Measured as stored: ModuleService saves cleanRichText(description), which can lengthen it ("&" -> "&amp;")
  if (tooLong(cleanRichText(payload.description), 500)) {
    return { isValid: false, error: "Module description must be 500 characters or fewer, formatting included." };
  }

  // Authors can only save a draft or submit for review; publishing goes through the review endpoint
  if (payload.status !== undefined && !["draft", "pending_review"].includes(payload.status)) {
    return { isValid: false, error: "Status must be 'draft' or 'pending_review'." };
  }

  const validateUrl = (urlString, fieldName, requireImageExtension = false) => {
    if (urlString === undefined || urlString === null || urlString === "") return null;
    if (typeof urlString !== "string") return `${fieldName} must be a text link.`;
    if (urlString.trim() === "") return null;
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
  if (tooLong(payload.image_url, MAX_URL_LENGTH)) {
    return { isValid: false, error: `Thumbnail URL must be ${MAX_URL_LENGTH} characters or fewer.` };
  }

  const videoError = validateUrl(payload.video_url, "Video URL", false);
  if (videoError) return { isValid: false, error: videoError };
  if (tooLong(payload.video_url, MAX_URL_LENGTH)) {
    return { isValid: false, error: `Video URL must be ${MAX_URL_LENGTH} characters or fewer.` };
  }

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
  if (payload.levels.length > MAX_LEVELS) {
    return { isValid: false, error: `A module can have at most ${MAX_LEVELS} levels.` };
  }

  // The columns below are NOT NULL integers / booleans, unique per module or level, so a bad value was a 500
  const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const isOrder = (v) => Number.isInteger(v) && v >= 1;
  const isOptionalBoolean = (v) => v === undefined || v === null || typeof v === "boolean";
  const levelOrders = new Set();

  for (let i = 0; i < payload.levels.length; i++) {
    const level = payload.levels[i];

    if (!isPlainObject(level)) {
      return { isValid: false, error: `Level ${i + 1} is not a valid level.` };
    }
    if (!isOrder(level.levelOrder) || levelOrders.has(level.levelOrder)) {
      return { isValid: false, error: `Level ${i + 1} needs its own position number (a whole number from 1).` };
    }
    levelOrders.add(level.levelOrder);
    if (!isOptionalBoolean(level.is_locked_by_default)) {
      return { isValid: false, error: `Level ${i + 1} locked setting must be true or false.` };
    }

    if (typeof level.levelTitle !== "string" || level.levelTitle.trim() === "") {
      return { isValid: false, error: `Level ${i + 1} is missing a valid title.` };
    }
    if (tooLong(level.levelTitle, MAX_TITLE_LENGTH)) {
      return { isValid: false, error: `Level ${i + 1} title must be ${MAX_TITLE_LENGTH} characters or fewer.` };
    }

    const coverError =
      validateCover(level.cover_image, `Level ${i + 1} cover image`) ||
      validateCover(level.coverImage, `Level ${i + 1} cover image`);
    if (coverError) return { isValid: false, error: coverError };

    // Blank means the default 80; the builder sends a number or a numeric string
    const threshold = level.passing_threshold;
    if (threshold != null && threshold !== "") {
      const value = typeof threshold === "number" || typeof threshold === "string" ? Number(threshold) : NaN;
      if (!Number.isInteger(value) || value < 0 || value > 100) {
        return { isValid: false, error: `Level ${i + 1} passing threshold must be a whole number from 0 to 100.` };
      }
    }

    if (!Array.isArray(level.steps) || level.steps.length === 0) {
      return { isValid: false, error: `Level ${i + 1} must contain at least one step.` };
    }
    if (level.steps.length > MAX_STEPS_PER_LEVEL) {
      return { isValid: false, error: `Level ${i + 1} can have at most ${MAX_STEPS_PER_LEVEL} steps.` };
    }

    const stepOrders = new Set();
    for (let j = 0; j < level.steps.length; j++) {
      const step = level.steps[j];

      if (!isPlainObject(step)) {
        return { isValid: false, error: `Step ${j + 1} in Level ${i + 1} is not a valid step.` };
      }
      if (!isOrder(step.stepOrder) || stepOrders.has(step.stepOrder)) {
        return { isValid: false, error: `Step ${j + 1} in Level ${i + 1} needs its own position number (a whole number from 1).` };
      }
      stepOrders.add(step.stepOrder);
      if (!isOptionalBoolean(step.is_final_assessment)) {
        return { isValid: false, error: `Step ${j + 1} in Level ${i + 1} final assessment setting must be true or false.` };
      }

      if (typeof step.stepTitle !== "string" || step.stepTitle.trim() === "") {
        return { isValid: false, error: `Step ${j + 1} in Level ${i + 1} is missing a title.` };
      }
      if (tooLong(step.stepTitle, MAX_TITLE_LENGTH)) {
        return { isValid: false, error: `Step ${j + 1} in Level ${i + 1} title must be ${MAX_TITLE_LENGTH} characters or fewer.` };
      }

      if (typeof step.stepType !== "string" || step.stepType.trim() === "") {
        return { isValid: false, error: `Step ${j + 1} in Level ${i + 1} is missing a step type.` };
      }
      if (!STEP_TYPES.includes(step.stepType)) {
        return { isValid: false, error: `Step ${j + 1} in Level ${i + 1} has an unknown step type.` };
      }

      const mediaError = validateUrl(step.mediaUrl, `Step ${j + 1} in Level ${i + 1} media URL`);
      if (mediaError) return { isValid: false, error: mediaError };
      if (tooLong(step.mediaUrl, MAX_URL_LENGTH)) {
        return { isValid: false, error: `Step ${j + 1} in Level ${i + 1} media URL must be ${MAX_URL_LENGTH} characters or fewer.` };
      }

      // ModuleService inserts quizQuestions for any step type, not only graded ones
      if (Array.isArray(step.quizQuestions)) {
        if (step.quizQuestions.length > MAX_QUESTIONS_PER_STEP) {
          return { isValid: false, error: `'${step.stepTitle}' can have at most ${MAX_QUESTIONS_PER_STEP} questions.` };
        }
        for (const q of step.quizQuestions) {
          // questions.question_text is NOT NULL for every step type, graded or not
          if (!isPlainObject(q) || typeof q.questionText !== "string" || q.questionText.trim() === "") {
            return { isValid: false, error: `A question in '${step.stepTitle}' is missing text.` };
          }
          const questionImageError = validateUrl(q?.imageURL, `A question image in '${step.stepTitle}'`);
          if (questionImageError) return { isValid: false, error: questionImageError };
          if (tooLong(q?.imageURL, MAX_URL_LENGTH)) {
            return { isValid: false, error: `A question image in '${step.stepTitle}' must be ${MAX_URL_LENGTH} characters or fewer.` };
          }
          if (Array.isArray(q?.options) && q.options.length > MAX_OPTIONS_PER_QUESTION) {
            return { isValid: false, error: `A question in '${step.stepTitle}' can have at most ${MAX_OPTIONS_PER_QUESTION} options.` };
          }
          // choices.choice_text and is_correct are NOT NULL; is_correct is cast from a boolean[]
          if (
            q?.options != null &&
            (!Array.isArray(q.options) || q.options.some((o) => typeof o?.text !== "string" || typeof o.isCorrect !== "boolean"))
          ) {
            return { isValid: false, error: `Each option in '${step.stepTitle}' needs text and a true/false isCorrect.` };
          }
          // choices.sequence_order is an int[] cast; the builder sends 1, 2, 3... for ordering steps
          if (Array.isArray(q.options) && q.options.some((o) => o.sequence_order != null && !(Number.isInteger(o.sequence_order) && o.sequence_order >= 0))) {
            return { isValid: false, error: `An option's order in '${step.stepTitle}' must be a whole number.` };
          }
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
          // Graded like QuizAttemptService.questionKind: only a hazard question can be right with nothing selected
          const kind = step.stepType === "situational" ? q.interactionType : step.stepType;
          if (kind !== "hazard_identification" && !q.options.some((o) => o.isCorrect)) {
            return { isValid: false, error: `A question in '${step.stepTitle}' must mark a correct option.` };
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
  // The composer's textarea stops at 5000 too (announcementModal.jsx)
  content: Joi.string().trim().min(1).max(5000).required().messages({
    "string.empty": "Content cannot be empty.",
    "string.max": "Content must be 5000 characters or fewer.",
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

/** True when a feedback :id route param can be a feedbacks.id (a positive int4); text, decimals and overflow made the query throw. */
exports.isFeedbackId = (id) => /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 2147483647;

/** A reply must be a non-blank string; a number, object or array was stored as its text form. */
exports.isReplyText = (reply) => typeof reply === "string" && reply.trim() !== "";

// The values FeedbackForm.jsx offers; getAdminFeedbacks only lists these two recipients
const FEEDBACK_RECIPIENTS = ["barangay", "mdrrmo"];
const FEEDBACK_TYPES = ["feedback", "inquiry", "concern", "report"];

/** The 400 message for a new ticket's first missing or invalid field, or null. */
exports.feedbackFieldsError = ({ recipient, type, subject, message }) => {
  if (!FEEDBACK_RECIPIENTS.includes(recipient)) return "Recipient must be barangay or mdrrmo.";
  if (!FEEDBACK_TYPES.includes(type)) return "Type must be feedback, inquiry, concern or report.";
  if (typeof subject !== "string" || !subject.trim()) return "Subject is required.";
  if (typeof message !== "string" || !message.trim()) return "Message is required.";
  return null;
};
