import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "react-router-dom";

export default function StatCard({
  icon,
  label,
  value,
  suffix,
  sub,
  color = "gray",
  loading,
  href,
  trendText,
  trend,
  zeroText,
  isNumeric = true,
  onClick,
  isActive,
}) {
  const iconColorMap = {
    gray: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700",
    blue: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
    green: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
    red: "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50",
    amber: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
    purple: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50",
  };

  const bgTintMap = {
    gray: "bg-white dark:bg-slate-900",
    blue: "bg-blue-50/40 dark:bg-slate-900",
    green: "bg-emerald-50/40 dark:bg-slate-900",
    red: "bg-red-50/40 dark:bg-slate-900",
    amber: "bg-amber-50/40 dark:bg-slate-900",
    purple: "bg-purple-50/40 dark:bg-slate-900",
  };

  const isZero = isNumeric && Number(value) === 0;
  const isClickable = !!href || !!onClick;

  const CardContent = (
    <div
      onClick={onClick}
      className={`${bgTintMap[color] || "bg-white dark:bg-slate-900"} rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3 h-full border transition-colors ${
        isClickable
          ? "hover:-translate-y-1 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] hover:border-red-200 dark:hover:border-slate-700 cursor-pointer transition-all duration-300"
          : ""
      } ${
        isActive
          ? "ring-2 ring-red-500 border-red-500 bg-red-50/10 dark:bg-red-950/20"
          : "border-gray-100/80 dark:border-slate-800"
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center border ${iconColorMap[color]} transition-opacity ${
            isZero ? "opacity-40" : "opacity-100"
          }`}
        >
          {icon && <HugeiconsIcon icon={icon} className="w-7 h-7" />}
        </div>

        {/* Support for trendText badge */}
        {trendText && !trend && (() => {
          const lower = trendText.toLowerCase();
          let badgeClass = "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300";
          if (
            lower.includes("growing") ||
            lower.includes("+") ||
            lower.includes("live") ||
            lower.includes("active") ||
            lower.includes("operational")
          )
            badgeClass = "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40";
          else if (
            lower.includes("stable") ||
            lower.includes("normal") ||
            lower.includes("fast")
          )
            badgeClass = "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40";
          else if (
            lower.includes("high") ||
            lower.includes("error") ||
            lower.includes("critical") ||
            lower.includes("check") ||
            lower.includes("slow")
          )
            badgeClass = "bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-800/40";

          return (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${badgeClass}`}
            >
              {trendText}
            </span>
          );
        })()}
      </div>

      {loading ? (
        <div className="space-y-2 mt-auto">
          <div className="h-10 w-20 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-5 w-32 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
        </div>
      ) : (
        <div className="mt-auto flex flex-col gap-1.5">
          <p
            className={`text-4xl lg:text-[40px] font-extrabold tracking-tight leading-none flex items-baseline ${
              isZero ? "text-gray-300 dark:text-slate-600" : "text-gray-900 dark:text-white"
            }`}
          >
            <span className={isNumeric ? "tabular-nums" : ""}>
              {isNumeric ? Number(value ?? 0).toLocaleString() : value}
            </span>
            {suffix && (
              <span
                className={`text-xl lg:text-2xl font-bold ml-1 ${
                  isZero ? "text-gray-300 dark:text-slate-600" : "text-gray-500 dark:text-slate-400"
                }`}
              >
                {suffix}
              </span>
            )}
          </p>
          <div>
            <p className="text-[17px] font-semibold text-gray-900 dark:text-white leading-snug">
              {label}
            </p>
            {sub && (
              <div className="text-[13px] text-gray-500 dark:text-slate-400 mt-0.5">
                {isZero && zeroText
                  ? zeroText
                  : isZero && typeof sub === "string" && !sub.includes("online")
                  ? "No activity yet"
                  : sub}
              </div>
            )}
          </div>

          {trend && (
            <div
              className={`mt-1 flex items-center text-[13px] font-bold ${
                trend.color === "green"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : trend.color === "red"
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-500 dark:text-slate-400"
              }`}
            >
              {trend.direction === "up" && <span className="mr-1">▲</span>}
              {trend.direction === "down" && <span className="mr-1">▼</span>}
              {trend.direction === "flat" && <span className="mr-1">—</span>}
              <span>{trend.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full">
        {CardContent}
      </Link>
    );
  }
  return CardContent;
}