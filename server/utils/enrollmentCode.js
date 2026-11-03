const crypto = require("crypto");


const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

/** Generates a random enrollment code using a cryptographically secure RNG. */
function generateEnrollmentCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
}

function normalizeCode(value) {
  return String(value ?? "").toUpperCase().replace(/[\s-]/g, "");
}

function codesMatch(stored, submitted) {
  const a = Buffer.from(normalizeCode(stored));
  const b = Buffer.from(normalizeCode(submitted));
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { generateEnrollmentCode, normalizeCode, codesMatch, CODE_LENGTH };
