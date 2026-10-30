// Urgent advisories are "in effect" until they expire or an admin lifts them.
// The API sends `in_effect`; it is derived here only for older cached items that lack it.
export function getAdvisoryStatus(item) {
  if (item?.priority !== "urgent") return null;
  if (item.lifted_at) return { state: "lifted", at: new Date(item.lifted_at) };
  const expiresAt = item.expires_at ? new Date(item.expires_at) : null;
  const inEffect = typeof item.in_effect === "boolean" ? item.in_effect : !expiresAt || expiresAt > new Date();
  if (inEffect) return { state: "in_effect", until: expiresAt };
  return { state: "ended", at: expiresAt };
}

export function formatAdvisoryTime(date) {
  if (!date) return "";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Year-qualified so the label is unique: numbering restarts each year
export function formatAdvisoryLabel(item) {
  const year = item?.advisory_year || (item?.created_at ? new Date(item.created_at).getFullYear() : null);
  const number = item?.advisory_number;
  if (!number) return "Advisory";
  return year ? `Advisory ${year}-${String(number).padStart(2, "0")}` : `Advisory #${number}`;
}
