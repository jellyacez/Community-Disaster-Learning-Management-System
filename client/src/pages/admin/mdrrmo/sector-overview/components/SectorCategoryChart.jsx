import {
  PieChart,
  Pie,
  Cell,
  Legend,
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
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Category Breakdown</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Certificates issued for <span className="font-semibold text-gray-900 dark:text-white">{selectedBarangayName}</span></p>
        </div>
        {selectedBarangayId && (
          <button 
            onClick={() => setSelectedBarangayId(null)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            Clear Selection
          </button>
        )}
      </div>
      
      <div className="w-full h-[280px] flex items-center justify-center">
        {isBreakdownLoading ? (
          <SkeletonChart type="donut" height={260} />
        ) : breakdownData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={breakdownData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                stroke="currentColor"
                className="text-white dark:text-[#0b1329]"
              >
                {breakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                ))}
                <Label 
                  value={breakdownData.reduce((acc, curr) => acc + curr.value, 0)} 
                  position="center" 
                  className="text-4xl font-black fill-gray-900 dark:fill-white drop-shadow-sm" 
                />
                <Label 
                  value="Total Certificates" 
                  position="center" 
                  dy={24} 
                  className="text-[10px] font-bold uppercase tracking-wider fill-gray-500 dark:fill-slate-400" 
                />
              </Pie>
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value, name) => {
                  const total = breakdownData.reduce((acc, curr) => acc + curr.value, 0);
                  const percent = ((value / total) * 100).toFixed(1);
                  return [`${value} (${percent}%)`, name];
                }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center text-gray-400 mb-3.5 shadow-2xs">
              <HugeiconsIcon icon={Certificate01Icon} className="w-8 h-8 text-gray-400 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              No certificates issued yet for {selectedBarangayName || "this sector"}.
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs">
              Residents have not completed or earned certification credentials for this sector yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
