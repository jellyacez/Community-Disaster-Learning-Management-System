const COLOR_MAP = {
  emerald: "bg-emerald-100 text-emerald-800 border border-transparent dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60",
  red: "bg-red-100 text-red-800 border border-transparent dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60",
  amber: "bg-amber-100 text-amber-800 border border-transparent dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60",
  gray: "bg-gray-100 text-gray-800 border border-transparent dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  slate: "bg-slate-100 text-slate-800 border border-transparent dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  purple: "bg-purple-100 text-purple-800 border border-transparent dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60",
  blue: "bg-blue-100 text-blue-800 border border-transparent dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60",
  teal: "bg-teal-100 text-teal-800 border border-transparent dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60",
};

export default function StatusBadge({ color = "gray", children, className = "" }) {
  const colorClasses = COLOR_MAP[color] || COLOR_MAP.gray;
  
  return (
    <span 
      className={`px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase rounded-full ${colorClasses} ${className}`}
    >
      {children}
    </span>
  );
}
