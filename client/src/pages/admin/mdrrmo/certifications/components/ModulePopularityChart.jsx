import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CATEGORY_COLORS = {
  Flood: "#3b82f6",
  Fire: "#ef4444",
  Earthquake: "#f59e0b",
  General: "#8b5cf6",
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white/95 backdrop-blur-md border border-gray-100 shadow-xl rounded-xl p-3 px-4 text-left">
        <p className="text-sm font-bold text-gray-900">{data.name}</p>
        <p className="text-xs font-semibold text-gray-600 mt-1">
          Total Certificates: <span className="text-gray-900 font-bold">{data.value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function ModulePopularityChart({ modules = [], isLoading }) {
  // Aggregate certificates by category
  const categoryMap = {};
  modules.forEach((mod) => {
    const cat = mod.category || "General";
    categoryMap[cat] = (categoryMap[cat] || 0) + (mod.total_certificates || 0);
  });

  const pieData = Object.entries(categoryMap)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || "#6b7280",
    }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-6 flex flex-col h-full min-h-[420px]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Module Popularity & Categories</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Certification volume distributed by disaster hazard domain
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
        </div>
      ) : pieData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          No module certification data available.
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-xs font-semibold text-gray-700">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Module Engagement List */}
          <div className="mt-4 border-t border-gray-100 pt-3 space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {modules.slice(0, 4).map((mod) => (
              <div key={mod.module_id} className="flex items-center justify-between text-xs py-1">
                <div className="truncate pr-2">
                  <span className="font-medium text-gray-800">{mod.module_title}</span>
                  <span className="ml-1.5 text-[10px] text-gray-400 uppercase font-semibold">
                    ({mod.category})
                  </span>
                </div>
                <span className="font-bold text-gray-900 shrink-0">
                  {mod.total_certificates} certs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
