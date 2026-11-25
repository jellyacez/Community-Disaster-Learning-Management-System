// Keep this policy in sync with server/utils/personName.js.
const NAME_FIELDS = ["first_name", "middle_name", "last_name"];
const LABELS = {
  first_name: "First name",
  middle_name: "Middle name",
  last_name: "Last name",
  name: "Full name",
};
// A single full-name field (admin provisioning) allows the longest name sign-up can derive:
// three 100-character parts and two spaces.
const MAX_LENGTH = { name: 302 };

function normalizeNamePart(value) {
  return typeof value === "string"
    ? value.normalize("NFC").trim().replace(/\s+/gu, " ")
    : value;
}

function validateNamePart(value, field) {
  if (
    field === "middle_name" &&
    (value === undefined || value === null || value === "")
  )
    return null;
  if (typeof value !== "string") return `${LABELS[field]} must be text.`;
  const clean = normalizeNamePart(value);
  if (!clean)
    return field === "middle_name"
      ? null
      : `Enter your ${LABELS[field].toLowerCase()}.`;
  const max = MAX_LENGTH[field] ?? 100;
  if (clean.length > max)
    return `${LABELS[field]} must be ${max} characters or fewer.`;
  if (/\p{N}/u.test(clean)) return `${LABELS[field]} cannot contain numbers.`;
  if (!/^[\p{L}\p{M} .'’-]+$/u.test(clean) || !/\p{L}/u.test(clean)) {
    return `${LABELS[field]} can contain letters, spaces, apostrophes, hyphens and periods.`;
  }
  return null;
}

function preparePersonName(input) {
  const errors = {};
  for (const field of NAME_FIELDS) {
    const message = validateNamePart(input[field], field);
    if (message) errors[field] = message;
  }
  if (Object.keys(errors).length) return { errors, data: null };
  const first_name = normalizeNamePart(input.first_name);
  const middle_name = normalizeNamePart(input.middle_name ?? "");
  const last_name = normalizeNamePart(input.last_name);
  return {
    errors,
    data: {
      first_name,
      middle_name,
      last_name,
      name: [first_name, middle_name, last_name].filter(Boolean).join(" "),
    },
  };
}

export { NAME_FIELDS, normalizeNamePart, validateNamePart, preparePersonName };
