
export default function HealthRow({ label, value, pill, pillColor, progress }) {
  const pillColors = {
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-600",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="py-3 border-b border-gray-50 last:border-0 flex flex-col justify-center">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-500">{label}</span>
        <div className="flex items-center gap-2">
          {pill && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${pillColors[pillColor || "gray"]}`}>
              {pill}
            </span>
          )}
          {value && <span className="text-sm font-semibold text-gray-800 font-mono">{value}</span>}
        </div>
      </div>
      {typeof progress === 'number' && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${progress > 85 ? 'bg-red-500' : progress > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
