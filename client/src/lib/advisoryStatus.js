// Urgent advisories are "in effect" until they expire or an admin lifts them.
// The API's `in_effect` can be stale on a copy saved for offline use, so an expiry that has
// since passed wins over it. (A lift made after the copy was saved can't be known offline.)
export function getAdvisoryStatus(item, now = new Date()) {
  if (item?.priority !== "urgent") return null;
  if (item.lifted_at) return { state: "lifted", at: new Date(item.lifted_at) };
  const expiresAt = item.expires_at ? new Date(item.expires_at) : null;
  const notExpired = !expiresAt || expiresAt > now;
  const inEffect = item.in_effect !== false && notExpired;
  if (inEffect) return { state: "in_effect", until: expiresAt };
  return { state: "ended", at: expiresAt };
}

// "Oct 30, 3:12 PM": advisories need the time of issue, not just the day
export function formatIssuedAt(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
