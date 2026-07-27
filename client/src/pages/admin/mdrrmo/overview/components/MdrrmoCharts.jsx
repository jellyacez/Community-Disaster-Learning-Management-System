import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
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

export default function MdrrmoCharts() {
  const { data: distributionData, isLoading: distLoading } = useQuery({
    queryKey: ["mdrrmoModuleDistribution"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/mdrrmo/module-distribution");
      return res.data.data;
    },
    refetchInterval: 60000,
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ["mdrrmoEnrollmentTrend"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/mdrrmo/enrollment-trend");
      return res.data.data;
    },
    refetchInterval: 60000,
  });

  // Red/Orange/Amber gradient theme for MDRRMO branding
  const pieColors = [
    { gradientId: "gradCat1", color1: "#fca5a5", color2: "#ef4444", dotColor: "#ef4444" },
    { gradientId: "gradCat2", color1: "#fdba74", color2: "#f97316", dotColor: "#f97316" },
    { gradientId: "gradCat3", color1: "#fcd34d", color2: "#f59e0b", dotColor: "#f59e0b" },
    { gradientId: "gradCat4", color1: "#f87171", color2: "#dc2626", dotColor: "#dc2626" },
    { gradientId: "gradCat5", color1: "#fb923c", color2: "#ea580c", dotColor: "#ea580c" },
  ];

  const pieData = (distributionData || []).map((item, idx) => ({
    ...item,
    ...pieColors[idx % pieColors.length]
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full h-full">
      {/* Module Distribution */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-6 flex flex-col h-full min-h-[350px] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <h2 className="text-base font-bold text-gray-900 mb-6">Module Distribution</h2>
        
        {distLoading ? (
          <div className="flex-1 flex items-center justify-center">
             <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !pieData || pieData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            No module data available.
          </div>
        ) : (
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
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
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={3}
                  animationBegin={200}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#${entry.gradientId})`} className="hover:opacity-80 transition-opacity duration-300 outline-none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                <Legend 
                  verticalAlign="bottom" 
                  content={(props) => {
                    const { payload } = props;
                    return (
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 px-2 mt-6">
                        {payload.map((entry, index) => {
                          const dataItem = pieData[index];
                          return (
                            <div key={`item-${index}`} className="flex items-center gap-2 group cursor-default">
                              <div 
                                className="w-3 h-3 rounded-full shrink-0 shadow-inner group-hover:scale-125 transition-transform" 
                                style={{ backgroundColor: dataItem.dotColor }} 
                              />
                              <span className="text-xs font-semibold text-gray-600 truncate group-hover:text-gray-900 transition-colors">
                                {dataItem.value} {dataItem.name}
                              </span>
                            </div>
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

      {/* Enrollment Trend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-6 flex flex-col h-full min-h-[350px] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-gray-900">Enrollment Trend</h2>
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-50 px-2 py-1 rounded-full animate-pulse">7 Days</span>
        </div>
        
        {trendLoading ? (
          <div className="flex-1 flex items-center justify-center">
             <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !trendData || trendData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            No enrollment data available.
          </div>
        ) : (
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
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
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                />
                <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                  type="monotone" 
                  dataKey="enrollments" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorEnrollments)" 
                  animationBegin={200}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
