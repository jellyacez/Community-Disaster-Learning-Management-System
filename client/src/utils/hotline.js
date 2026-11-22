// A hotline is dialable only when it is not a sample and has a tel. Sample rows are never links.
export function isDialable(contact) {
  return !contact.is_sample && typeof contact.tel === "string" && contact.tel.length > 0;
}
