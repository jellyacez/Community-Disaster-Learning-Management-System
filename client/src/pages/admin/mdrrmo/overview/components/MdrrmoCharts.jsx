import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import { SkeletonChart } from "../../../../../components/ui/Skeleton";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 shadow-xl rounded-xl p-3 px-4">
        <p className="text-sm font-bold text-gray-900">{payload[0].name}</p>
        <p className="text-xs font-semibold text-gray-600 mt-1">Modules: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const TrendTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-red-900/90 backdrop-blur-md shadow-xl rounded-xl p-3 px-4 border border-red-800/50">
        <p className="text-xs font-semibold text-red-200 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-white mt-1">
          <span className="text-red-400 mr-2">●</span>
          {payload[0].value} Enrollments
        </p>
      </div>
    );
  }
  return null;
};

export function MdrrmoModuleDistributionChart({ onCategoryClick, selectedCategory }) {
  const { data: distributionData, isLoading: distLoading } = useQuery({
    queryKey: ["mdrrmoModuleDistribution"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/mdrrmo/module-distribution");
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const getCategoryColor = (name) => {
    const n = (name || "").toLowerCase();
    if (n.includes('flood')) return { gradientId: `gradFlood`, color1: "#93c5fd", color2: "#3b82f6", dotColor: "#3b82f6" }; // Blue
    if (n.includes('fire')) return { gradientId: `gradFire`, color1: "#fca5a5", color2: "#ef4444", dotColor: "#ef4444" }; // Red
    if (n.includes('earthquake')) return { gradientId: `gradEarthquake`, color1: "#fcd34d", color2: "#d97706", dotColor: "#d97706" }; // Amber/Brown
    return { gradientId: `gradGen${name.replace(/[^a-zA-Z0-9]/g, '')}`, color1: "#d1d5db", color2: "#6b7280", dotColor: "#6b7280" }; // Gray for General/others
  };

  const pieData = (distributionData || []).map((item) => ({
    ...item,
    ...getCategoryColor(item.name)
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-6 flex flex-col h-full min-h-[360px] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Module Distribution</h2>
          <p className="text-xs text-gray-400 mt-0.5">Published syllabus breakdown</p>
        </div>
        {selectedCategory && (
          <button onClick={() => onCategoryClick(null)} className="text-xs text-red-600 font-semibold hover:underline cursor-pointer">
            Clear Filter
          </button>
        )}
      </div>
      
      {distLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <SkeletonChart type="donut" height={220} />
        </div>
      ) : !pieData || pieData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400 py-8">
          No module data available.
        </div>
      ) : (
        <div className="w-full h-[270px]">
          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <defs>
                {pieData.map((entry, index) => (
                  <linearGradient key={`grad-${index}`} id={entry.gradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={entry.color1} />
                    <stop offset="100%" stopColor={entry.color2} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={pieData}
                cx="50%"
                cy="42%"
                innerRadius={48}
                outerRadius={75}
                paddingAngle={6}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={3}
                animationBegin={200}
                animationDuration={1200}
                animationEasing="ease-out"
                onClick={(data) => {
                  if (onCategoryClick && data?.name) {
                    onCategoryClick(data.name === selectedCategory ? null : data.name);
                  }
                }}
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#${entry.gradientId})`} 
                    className={`transition-all duration-300 outline-none cursor-pointer hover:opacity-80 ${selectedCategory && selectedCategory !== entry.name ? 'opacity-30' : 'opacity-100'}`} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
              <Legend 
                verticalAlign="bottom" 
                content={(props) => {
                  const { payload } = props;
                  const total = pieData.reduce((a, b) => a + (b.value || 0), 0) || 1;
                  return (
                    <div className="grid grid-cols-2 gap-y-2 gap-x-3 px-1 mt-1">
                      {payload.map((entry, index) => {
                        const dataItem = pieData[index];
                        if (!dataItem) return null;
                        const isSelected = selectedCategory === dataItem.name;
                        const pct = Math.round((dataItem.value / total) * 100);
                        return (
                          <button 
                            key={`item-${index}`} 
                            type="button"
                            className={`flex items-center gap-1.5 text-left group cursor-pointer transition-opacity ${selectedCategory && !isSelected ? 'opacity-35' : 'opacity-100'}`}
                            onClick={() => onCategoryClick(isSelected ? null : dataItem.name)}
                          >
                            <span 
                              className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform ${isSelected ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'group-hover:scale-110'}`} 
                              style={{ backgroundColor: dataItem.dotColor }} 
                            />
                            <span className={`text-xs font-medium truncate ${isSelected ? 'text-gray-900 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                              {dataItem.value} {dataItem.name} <span className="text-gray-400 font-normal">({pct}%)</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function MdrrmoEnrollmentTrendChart() {
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ["mdrrmoEnrollmentTrend"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/mdrrmo/enrollment-trend");
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const totalWeeklyEnrollments = Array.isArray(trendData)
    ? trendData.reduce((acc, item) => acc + (item.enrollments || 0), 0)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-6 flex flex-col h-full min-h-[360px] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">Enrollment & Activity Trend</h2>
            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
              7 Days
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalWeeklyEnrollments} total module {totalWeeklyEnrollments === 1 ? "enrollment" : "enrollments"} recorded this week
          </p>
        </div>
      </div>
      
      {trendLoading ? (
        <div className="flex-1 flex flex-col justify-center">
          <SkeletonChart type="area" height={220} />
        </div>
      ) : !trendData || trendData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          No enrollment activity recorded for the past 7 days.
        </div>
      ) : (
        <div className="w-full h-[240px] mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                domain={[0, 'auto']}
                tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area 
                type="monotone" 
                dataKey="enrollments" 
                stroke="#ef4444" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorEnrollments)" 
                animationBegin={200}
                animationDuration={1200}
                animationEasing="ease-out"
                activeDot={{ r: 5, strokeWidth: 0, fill: '#ef4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
