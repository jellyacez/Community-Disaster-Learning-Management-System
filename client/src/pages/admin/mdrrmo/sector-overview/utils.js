export const getCategoryColor = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes('fire')) return '#EF4444'; // Red
  if (lower.includes('flood')) return '#3B82F6'; // Blue
  if (lower.includes('earthquake')) return '#F59E0B'; // Amber
  return '#9CA3AF'; // Gray for General/Other
};

export const getLeaderboardColor = (rate) => {
  if (rate >= 80) return "bg-emerald-500";
  if (rate >= 50) return "bg-blue-500";
  if (rate >= 20) return "bg-amber-500";
  return "bg-red-500";
};
