// Mirrors server/services/admin/EmergencyContactsService.js so errors show before saving.
// The server stays the authority; its errors[] are mapped onto the same fields.
export const MAX_HOTLINES = 15;
const MAX_TEXT = 80;
const PHONE_RE = /^\+?[0-9][0-9 -]*[0-9]$/;
const HIDDEN_CHARS_RE = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u;

function textError(value, what) {
  const text = value.trim();
  const length = Array.from(text).length;
  if (length === 0) return `Enter the ${what}.`;
  if (length > MAX_TEXT) return `Keep the ${what} to ${MAX_TEXT} characters (now ${length}).`;
  if (HIDDEN_CHARS_RE.test(text)) return "Remove the line break or hidden character.";
  return null;
}

function phoneError(value) {
  const phone = value.trim();
  if (!phone) return "Enter the number.";
  if (phone.length > 32 || !PHONE_RE.test(phone)) {
    return "Use digits, spaces and dashes only, with an optional leading +. No ( ) or extensions.";
  }
  const digits = phone.replace(/\D/g, "").length;
  if (digits < 3 || digits > 15) return `Use 3 to 15 digits (now ${digits}).`;
  return null;
}

// { rows: [{ agency?, label?, phone? }], list: string | null }
export function validateHotlines(rows) {
  const rowErrors = rows.map((r) => {
    const errors = {};
    const agency = textError(r.agency, "agency");
    const label = textError(r.label, "line name");
    const phone = phoneError(r.phone);
    if (agency) errors.agency = agency;
    if (label) errors.label = label;
    if (phone) errors.phone = phone;
    return errors;
  });
  let list = null;
  if (rows.length === 0) list = "Add at least one hotline.";
  else if (rows.length > MAX_HOTLINES) list = `Keep the list to ${MAX_HOTLINES} hotlines.`;
  else if (!rows.some((r) => r.active)) list = "Keep at least one hotline active, or residents see none.";
  return { rows: rowErrors, list };
}

export const hasErrors = (v) => Boolean(v.list) || v.rows.some((e) => Object.keys(e).length > 0);

// The dial string the server will build, so the preview matches what residents get.
export function previewTel(row) {
  if (row.is_sample || phoneError(row.phone)) return null;
  return row.phone.trim().replace(/[ -]/g, "");
}
