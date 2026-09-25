export function getActionColor(actionText) {
  if (!actionText) return "text-gray-700 dark:text-slate-300";
  const text = actionText.toLowerCase();
  if (text.match(/\b(failed|rejected|denied|revoked|banned|blocked|deleted)\b/)) {
    return "text-red-700 dark:text-red-400";
  }
  if (text.match(/\b(successfully|approved|created|earned|completed|provisioned|restored|unbanned|unblocked)\b/)) {
    return "text-emerald-700 dark:text-emerald-400";
  }
  return "text-gray-700 dark:text-slate-300";
}
