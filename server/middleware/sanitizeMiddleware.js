const sanitizeHtml = require("sanitize-html");
const { decodeHTML } = require("entities");

/** Rich-text fields skip the plain-text strip; cleanRichText() handles them. */
const RICH_TEXT_FIELDS = new Set([
  // module builder fields, cleaned by cleanRichText() in ModuleService.js
  "description",
  "levelDescription",
  "stepContent",
  "rationale",         // quiz choice rationale (may contain formatted text)
  "content",
  "body",
]);

/** Passed through untouched: passwords are compared as opaque strings, and escaping '&' would break URLs. */
const PASSTHROUGH_FIELDS = new Set([
  "password",
  "newPassword",
  "currentPassword",
  "image_url",
  "system_logo",
  "video_url",
  "mediaUrl",
  "imageURL",
]);

/**
 * Strips all HTML from every string, walking objects and arrays. Rich-text fields are
 * cleaned separately (utils/sanitizeHtml.js#cleanRichText), and passwords/URLs pass through.
 * Numbers and booleans are returned as-is so ids and page/limit aren't coerced to strings.
 */
const stripAllHtml = (value, key = null) => {
  if (key && (RICH_TEXT_FIELDS.has(key) || PASSTHROUGH_FIELDS.has(key))) {
    return value;
  }

  if (typeof value === "string") {
    return decodeHTML(sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }));
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripAllHtml(item, key));
  }
  if (value !== null && typeof value === "object") {
    const sanitized = {};
    for (const k of Object.keys(value)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") {
        continue;
      }
      sanitized[k] = stripAllHtml(value[k], k);
    }
    return sanitized;
  }
  return value;
};

/**
 * Sanitizes req.body, req.query and req.params. Safe to mount globally: multipart
 * uploads aren't parsed by express.json, so they never reach req.body here.
 */
const sanitizeMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = stripAllHtml(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = stripAllHtml(req.query);
  }
  if (req.params && typeof req.params === "object") {
    req.params = stripAllHtml(req.params);
  }
  next();
};

module.exports = sanitizeMiddleware;
