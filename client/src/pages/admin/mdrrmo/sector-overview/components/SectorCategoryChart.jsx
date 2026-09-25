import {
  PieChart,
  Pie,
  Cell,
  Label,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";
import { HugeiconsIcon } from "@hugeicons/react";
import { Certificate01Icon } from "@hugeicons/core-free-icons";
import { getCategoryColor } from "../utils";
import { SkeletonChart } from "../../../../../components/ui/Skeleton";

export default function SectorCategoryChart({ 
  selectedBarangayId, 
  selectedBarangayName, 
  setSelectedBarangayId, 
  isBreakdownLoading, 
  breakdownData = []
}) {
  const totalCerts = breakdownData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm flex flex-col h-full min-h-[380px]">
      <div className="flex justify-between items-start mb-2 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Category Breakdown</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Certificates issued for <span className="font-semibold text-gray-900 dark:text-white">{selectedBarangayName}</span>
          </p>
        </div>
        {selectedBarangayId && (
          <button 
            onClick={() => setSelectedBarangayId(null)}
            className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
          >
            Clear Selection
          </button>
        )}
      </div>
      
      {isBreakdownLoading ? (
        <div className="flex-1 flex items-center justify-center py-4">
          <SkeletonChart type="donut" height={200} />
        </div>
      ) : breakdownData.length > 0 ? (
        <div className="w-full flex-1 flex flex-col justify-center items-center py-1 min-h-0">
          <div className="w-full h-[210px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={breakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={84}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="currentColor"
                  className="text-white dark:text-[#0b1329]"
                  strokeWidth={2}
                >
                  {breakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                  ))}
                  <Label 
                    value={totalCerts} 
                    position="center" 
                    className="text-3xl font-black fill-gray-900 dark:fill-white drop-shadow-sm" 
                  />
                  <Label 
                    value="Total Certificates" 
                    position="center" 
                    dy={22} 
                    className="text-[9px] font-bold uppercase tracking-wider fill-gray-400 dark:fill-slate-400" 
                  />
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '8px 12px' }}
                  formatter={(value, name) => {
                    const percent = totalCerts > 0 ? ((value / totalCerts) * 100).toFixed(1) : 0;
                    return [`${value} certs (${percent}%)`, name];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Metric Pills / Grid */}
          <div className="w-full mt-2 pt-3 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 gap-2 shrink-0">
            {breakdownData.map((item) => {
              const percent = totalCerts > 0 ? Math.round((item.value / totalCerts) * 100) : 0;
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2 rounded-xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50"
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: getCategoryColor(item.name) }}
                    />
                    <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 truncate">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white shrink-0">
                    {item.value} <span className="text-[10px] text-gray-400 font-normal">({percent}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center text-gray-400 mb-3 shadow-2xs">
            <HugeiconsIcon icon={Certificate01Icon} className="w-7 h-7 text-gray-400 stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            No certificates issued yet for {selectedBarangayName || "this sector"}.
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs">
            Residents have not completed or earned certification credentials for this sector yet.
          </p>
        </div>
      )}
    </div>
  );
}
