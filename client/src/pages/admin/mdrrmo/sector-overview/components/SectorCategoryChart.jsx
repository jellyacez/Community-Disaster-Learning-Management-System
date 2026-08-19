import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Label,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";
import { getCategoryColor } from "../utils";

export default function SectorCategoryChart({ 
  selectedBarangayId, 
  selectedBarangayName, 
  setSelectedBarangayId, 
  isBreakdownLoading, 
  breakdownData 
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Category Breakdown</h2>
          <p className="text-sm text-gray-500">Certificates issued for <span className="font-semibold text-gray-900">{selectedBarangayName}</span></p>
        </div>
        {selectedBarangayId && (
          <button 
            onClick={() => setSelectedBarangayId(null)}
            className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
          >
            Clear Selection
          </button>
        )}
      </div>
      
      <div className="flex-1 min-h-[300px] flex items-center justify-center">
        {isBreakdownLoading ? (
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-32 h-32 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        ) : breakdownData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdownData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {breakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                ))}
                <Label 
                  value={breakdownData.reduce((acc, curr) => acc + curr.value, 0)} 
                  position="center" 
                  className="text-4xl font-black fill-gray-900 drop-shadow-sm" 
                />
                <Label 
                  value="Total Certificates" 
                  position="center" 
                  dy={24} 
                  className="text-[10px] font-bold uppercase tracking-wider fill-gray-500" 
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
          <div className="text-center text-gray-400">
            <p className="text-sm">No active certificates found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
