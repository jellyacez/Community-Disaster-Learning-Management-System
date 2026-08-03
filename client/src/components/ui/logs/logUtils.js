export function getActionColor(actionText) {
  if (!actionText) return "text-gray-700";
  const text = actionText.toLowerCase();
  if (text.match(/\b(failed|rejected|denied|revoked|banned|blocked|deleted)\b/)) {
    return "text-red-700";
  }
  if (text.match(/\b(successfully|approved|created|earned|completed|provisioned|restored|unbanned|unblocked)\b/)) {
    return "text-emerald-700";
  }
  return "text-gray-700";
}
