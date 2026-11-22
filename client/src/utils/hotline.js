const TEL_RE = /^\+?[0-9]{3,15}$/;

// The number a hotline link dials, or null when it must not be a link. It is derived from the
// shown phone and must agree with the server's tel, so a link never dials something other than
// what it shows. Sample rows are never dialable.
export function dialString(contact) {
  if (contact.is_sample || typeof contact.phone !== "string" || typeof contact.tel !== "string") return null;
  const derived = contact.phone.trim().replace(/[ -]/g, "");
  return TEL_RE.test(derived) && derived === contact.tel ? derived : null;
}

export const isDialable = (contact) => dialString(contact) !== null;
