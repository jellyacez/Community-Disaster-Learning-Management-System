// Validation for the System Branding settings (docs/specs/branding.md). Used on save and again on read,
// so a value stored by an older version, SQL or a restore is never trusted.

const MAX_LOGO_BYTES = 500 * 1024;
const NAME_MIN = 2;
const NAME_MAX = 60;
const FOOTER_MAX = 200;
const EMAIL_MAX = 254;
const CONTROL_CHARS = /\p{Cc}/u;
// Bidi embedding/override/isolate controls can reverse how a name reads in subjects and sender names.
// ZWJ/ZWNJ (U+200D/U+200C) stay allowed: some scripts need them.
const BIDI_CONTROLS = /[\u202A-\u202E\u2066-\u2069]/u;

const LOGO_TYPES = {
  png: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  jpeg: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b.length >= 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP",
};
const LOGO_DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

const MESSAGES = {
  nameLength: `System name must be ${NAME_MIN} to ${NAME_MAX} characters.`,
  nameControl: "System name can't contain line breaks or tabs.",
  nameBidi: "System name can't contain text-direction control characters.",
  svg: "SVG logos aren't accepted. Use PNG, JPG or WEBP.",
  logoFormat: "Logo must be a PNG, JPG or WEBP image.",
  logoBytes: "The file isn't a valid PNG, JPG or WEBP image.",
  logoSize: "Logo image is too large. Maximum size is 500 KB.",
};

// Returns { value } (trimmed) or { error }
function validateSystemName(input) {
  if (typeof input !== "string") return { error: MESSAGES.nameLength };
  const value = input.trim();
  if (CONTROL_CHARS.test(value)) return { error: MESSAGES.nameControl };
  if (BIDI_CONTROLS.test(value)) return { error: MESSAGES.nameBidi };
  const length = [...value].length;
  if (length < NAME_MIN || length > NAME_MAX) return { error: MESSAGES.nameLength };
  return { value };
}

// Returns { type, contentType, bytes } or { error }
function parseLogo(input) {
  if (typeof input !== "string") return { error: MESSAGES.logoFormat };
  if (/^data:image\/svg/i.test(input)) return { error: MESSAGES.svg };
  const match = LOGO_DATA_URL.exec(input);
  if (!match || match[2].length % 4 !== 0) return { error: MESSAGES.logoFormat };
  const type = match[1];
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_LOGO_BYTES) return { error: MESSAGES.logoSize };
  if (!LOGO_TYPES[type](bytes)) return { error: MESSAGES.logoBytes };
  return { type, contentType: `image/${type}`, bytes };
}

// Empty clears the setting; anything else must be one plain address (it goes into the Reply-To header)
function validateSupportEmail(input) {
  if (input === null || input === "") return { value: "" };
  if (typeof input !== "string") return { error: "Support email must be a valid email address." };
  const value = input.trim();
  if (value === "") return { value: "" };
  if (value.length > EMAIL_MAX || CONTROL_CHARS.test(value) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { error: "Support email must be a valid email address." };
  }
  return { value };
}

function validateOrgFooter(input) {
  if (input === null || input === "") return { value: "" };
  if (typeof input !== "string") return { error: `Footer text must be at most ${FOOTER_MAX} characters on one line.` };
  const value = input.trim();
  if ([...value].length > FOOTER_MAX || CONTROL_CHARS.test(value)) {
    return { error: `Footer text must be at most ${FOOTER_MAX} characters on one line.` };
  }
  return { value };
}

module.exports = {
  MAX_LOGO_BYTES,
  validateSystemName,
  parseLogo,
  validateSupportEmail,
  validateOrgFooter,
};
