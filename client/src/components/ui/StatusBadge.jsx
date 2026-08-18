const COLOR_MAP = {
  emerald: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  gray: "bg-gray-100 text-gray-800",
  slate: "bg-slate-100 text-slate-800",
  purple: "bg-purple-100 text-purple-800",
  blue: "bg-blue-100 text-blue-800",
  teal: "bg-teal-100 text-teal-800",
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
