import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "react-router-dom";

export default function StatCard({ icon, label, value, sub, color = "gray", loading, href, trendText, trend, zeroText, isNumeric = true, onClick, isActive }) {
  const iconColorMap = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    red: "bg-red-100 text-red-700 border-red-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
  };

  const bgTintMap = {
    gray: "bg-white",
    blue: "bg-blue-50/40",
    green: "bg-emerald-50/40",
    red: "bg-red-50/40",
    amber: "bg-amber-50/40",
    purple: "bg-purple-50/40",
  };
  
  const isZero = isNumeric && Number(value) === 0;
  const isClickable = !!href || !!onClick;

  const CardContent = (
    <div 
      onClick={onClick}
      className={`${bgTintMap[color] || 'bg-white'} rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3 h-full border ${
        isClickable ? "hover:-translate-y-1 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] hover:border-red-200 cursor-pointer transition-all duration-300" : ""
      } ${isActive ? "ring-2 ring-red-500 border-red-500 bg-red-50/10" : "border-gray-100/80"}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${iconColorMap[color]} bg-opacity-60 transition-opacity ${isZero ? 'opacity-40' : 'opacity-100'}`}>
          <HugeiconsIcon icon={icon} className="w-7 h-7" />
        </div>
        
        {/* Legacy support for trendText badge */}
        {trendText && !trend && (() => {
          const lower = trendText.toLowerCase();
          let badgeClass = "bg-gray-100 text-gray-600"; // default gray
          if (lower.includes("growing") || lower.includes("+") || lower.includes("live") || lower.includes("active") || lower.includes("operational")) badgeClass = "bg-emerald-100 text-emerald-700";
          else if (lower.includes("stable") || lower.includes("normal") || lower.includes("fast")) badgeClass = "bg-blue-100 text-blue-700";
          else if (lower.includes("high") || lower.includes("error") || lower.includes("critical") || lower.includes("check") || lower.includes("slow")) badgeClass = "bg-red-100 text-red-700";
          
          return (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${badgeClass}`}>
              {trendText}
            </span>
          );
        })()}
      </div>
      {loading ? (
        <div className="space-y-2 mt-auto">
          <div className="h-10 w-20 bg-gray-100 rounded animate-pulse" />
          <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : (
        <div className="mt-auto flex flex-col gap-2">
          <p className={`text-4xl lg:text-[40px] font-extrabold tracking-tight leading-none ${isZero ? "text-gray-300" : "text-gray-900"} ${isNumeric ? "tabular-nums" : ""}`}>
            {isNumeric ? Number(value ?? 0).toLocaleString() : value}
          </p>
          <div>
            <p className="text-[18px] font-semibold text-gray-900 leading-snug">{label}</p>
            {sub && <div className="text-[13px] text-gray-500 mt-1">
              {isZero && zeroText ? zeroText : (isZero && typeof sub === 'string' && !sub.includes('online') ? "No activity yet" : sub)}
            </div>}
          </div>
          
          {/* New specific trend block below the label */}
          {trend && (
            <div className={`mt-1 flex items-center text-[13px] font-bold ${
              trend.color === 'green' ? 'text-emerald-600' :
              trend.color === 'red' ? 'text-red-600' :
              'text-gray-500'
            }`}>
              {trend.direction === 'up' && <span className="mr-1">▲</span>}
              {trend.direction === 'down' && <span className="mr-1">▼</span>}
              {trend.direction === 'flat' && <span className="mr-1">—</span>}
              <span>{trend.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link to={href} className="block h-full">{CardContent}</Link>;
  }
  return CardContent;
}
