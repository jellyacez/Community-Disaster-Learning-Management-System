import React from "react";

export default function HealthRow({ label, value, pill, pillColor }) {
  const pillColors = {
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-600",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        {pill && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pillColors[pillColor || "gray"]}`}>
            {pill}
          </span>
        )}
        {value && <span className="text-sm font-semibold text-gray-800 font-mono">{value}</span>}
      </div>
    </div>
  );
}
