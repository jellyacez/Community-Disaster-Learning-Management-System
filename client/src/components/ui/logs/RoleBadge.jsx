const ROLE_COLORS = {
  system_admin: "bg-red-100 text-red-800 border border-transparent dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60",
  head_mdrrmo_admin: "bg-purple-100 text-purple-800 border border-transparent dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60",
  mdrrmo_admin: "bg-blue-100 text-blue-800 border border-transparent dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60",
  barangay_admin: "bg-teal-100 text-teal-800 border border-transparent dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60",
  resident: "bg-gray-100 text-gray-600 border border-transparent dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const ROLE_LABELS = {
  system_admin: "System Admin",
  head_mdrrmo_admin: "Head Admin",
  mdrrmo_admin: "MDRRMO Admin",
  barangay_admin: "Barangay Admin",
  resident: "Resident",
};

export default function RoleBadge({ role }) {
  const colorClass = ROLE_COLORS[role] || "bg-gray-100 text-gray-600 border border-transparent dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  const label = ROLE_LABELS[role] || role || "—";
  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-full ${colorClass}`}>
      {label}
    </span>
  );
}
