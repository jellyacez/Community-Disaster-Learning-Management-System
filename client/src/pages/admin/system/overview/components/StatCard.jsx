import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "react-router-dom";

export default function StatCard({ icon, label, value, sub, color = "gray", loading, href, trendText, zeroText }) {
  const colorMap = {
    gray: "bg-gray-50 text-gray-700 border-gray-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };
  
  const isZero = Number(value) === 0;

  const CardContent = (
    <div className={`bg-white rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-3 h-full ${
      href ? "hover:-translate-y-1 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] hover:border-gray-100 cursor-pointer transition-all duration-300 border border-transparent" : "border border-transparent"
    }`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorMap[color]} transition-opacity ${isZero ? 'opacity-40' : 'opacity-100'}`}>
          <HugeiconsIcon icon={icon} className="w-5 h-5" />
        </div>
        {trendText && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-500 px-2 py-1 rounded-full">
            {trendText}
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2 mt-auto">
          <div className="h-7 w-16 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : (
        <div className="mt-auto">
          <p className={`text-3xl font-extrabold tabular-nums tracking-tight ${isZero ? "text-gray-300" : "text-gray-900"}`}>
            {Number(value ?? 0).toLocaleString()}
          </p>
          <div>
            <p className="text-sm font-semibold text-gray-700 mt-1">{label}</p>
            {sub && <div className="text-xs text-gray-500 mt-0.5">
              {isZero && zeroText ? zeroText : (isZero && typeof sub === 'string' && !sub.includes('online') ? "No activity yet" : sub)}
            </div>}
          </div>
        </div>
      )}
    </div>
  );

  return href ? <Link to={href} className="block">{CardContent}</Link> : CardContent;
}
