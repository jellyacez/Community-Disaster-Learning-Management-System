const sanitizeHtml = require("sanitize-html");
const { decodeHTML } = require("entities");

/**
 * List of fields that contain rich text.
 * These should be excluded from the stripAllHtml middleware
 * so that cleanRichText() can handle them safely.
 */
const RICH_TEXT_FIELDS = new Set([
  // Module builder fields — sanitized by cleanRichText() in ModuleService.js
  "description",       // module-level description
  "levelDescription",  // per-level description
  "stepContent",       // lesson/reading step HTML content
  "rationale",         // quiz choice rationale (may contain formatted text)
  // Generic rich-text field names used elsewhere
  "content",
  "body",
]);

/**
 * Fields that must pass through untouched without HTML stripping:
 * - Passwords: must never be HTML-sanitized; they are hashed/compared as opaque strings.
 * - URLs: query strings containing '&' or valid URL characters must not be entity-escaped.
 */
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
 * Recursively walk a value and sanitize every string.
 *
 * Two modes:
 *  - Plain text (default): allowedTags=[] strips ALL html — names, subjects,
 *    messages, reasons, IPs, etc.
 *  - Rich text: handled separately by utils/sanitizeHtml.js#cleanRichText()
 *    which allows the app's safe HTML subset. Never pass rich-text fields
 *    through this middleware; sanitize them in the controller instead.
 *  - Passthrough: passwords and URLs pass through untouched.
 *
 * Objects and arrays are walked recursively so nested payloads are fully
 * covered without any per-route wiring.
 *
 * Non-string primitives (numbers, booleans) are returned as-is so that
 * JSON number fields (e.g. page, limit, ids) are not coerced to strings.
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
  // number, boolean, null, undefined — leave untouched
  return value;
};

/**
 * Express middleware.
 *
 * Sanitizes:
 *  - req.body   — POST/PUT/PATCH JSON payloads
 *  - req.query  — URL query string parameters
 *  - req.params — URL route parameters (e.g. :id, :token)
 *
 * Safe to mount globally BEFORE route handlers. Does not affect file
 * uploads (multipart bodies are not parsed by express.json so they
 * never appear in req.body here).
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
