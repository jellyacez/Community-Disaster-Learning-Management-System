const { logError } = require("./logger");

// An error we throw on purpose for the client to read: a message written for users and a 4xx status.
class AppError extends Error {
  constructor(message, statusCode = 400, options) {
    super(message, options);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

// node-postgres errors carry severity and code; their text names tables, columns and values
const isDatabaseError = (err) =>
  typeof err?.severity === "string" && typeof err?.code === "string";

// Expected means marked: an AppError, or an error given a 4xx statusCode where it was thrown
// (the convention FeedbackService and ModuleService already use). Never decided from message text.
const isExpectedError = (err) =>
  !isDatabaseError(err) &&
  Number.isInteger(err?.statusCode) &&
  err.statusCode >= 400 &&
  err.statusCode < 500;

// Expected errors keep their status and message. Anything else is logged with its detail and the
// client gets a generic 500. `field` is the key the endpoint's clients already read ("message" or
// "error"); `prefix` is text already shown ahead of an expected message.
function respondWithError(res, err, { event, fallback, field = "message", prefix = "", context = {} }) {
  if (isExpectedError(err)) {
    return res.status(err.statusCode).json({ success: false, [field]: `${prefix}${err.message}` });
  }
  logError(event, {
    ...context,
    code: err?.code,
    name: err?.name,
    message: err?.message,
    stack: err?.stack,
  });
  return res.status(500).json({ success: false, [field]: fallback });
}

module.exports = { AppError, isExpectedError, isDatabaseError, respondWithError };
