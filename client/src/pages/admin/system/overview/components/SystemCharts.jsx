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
      <div className="bg-white/80 backdrop-blur-md border border-white/50 shadow-xl rounded-xl p-3 px-4">
        <p className="text-sm font-bold text-gray-900">{payload[0].name}</p>
        <p className="text-xs font-semibold text-gray-600 mt-1">Count: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const TrafficTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/90 backdrop-blur-md shadow-xl rounded-xl p-3 px-4 border border-gray-700/50">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-white mt-1">
          <span className="text-red-400 mr-2">●</span>
          {payload[0].value} Active Users
        </p>
      </div>
    );
  }
  return null;
};

export default function SystemCharts({ stats }) {
  const { data: trafficData } = useQuery({
    queryKey: ["trafficAnalytics"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/analytics/traffic");
      return res.data.data;
    },
    refetchInterval: 60000,
  });

  if (!stats) return null;

  // Premium Gradient Palette
  const pieData = [
    { name: "Residents", value: Number(stats.resident_users || 0), gradientId: "gradResident", color1: "#cbd5e1", color2: "#94a3b8", dotColor: "#94a3b8" }, 
    { name: "Barangay Admins", value: Number(stats.barangay_admin_users || 0), gradientId: "gradBrgy", color1: "#2dd4bf", color2: "#0f766e", dotColor: "#14b8a6" }, 
    { name: "Mdrrmo Admins", value: Number(stats.mdrrmo_admin_users || 0), gradientId: "gradMdrrmo", color1: "#60a5fa", color2: "#1d4ed8", dotColor: "#3b82f6" }, 
    { name: "System Admins", value: Number(stats.system_admin_users || 0), gradientId: "gradSys", color1: "#c084fc", color2: "#7e22ce", dotColor: "#a855f7" }, 
  ];

  const filteredPieData = pieData.filter(item => item.value > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full h-full">
      {/* User Distribution */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-6 flex flex-col h-full min-h-[350px] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <h2 className="text-base font-bold text-gray-900 mb-6">User Distribution</h2>
        
        {filteredPieData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            No user data available.
          </div>
        ) : (
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {filteredPieData.map((entry, index) => (
                    <linearGradient key={`grad-${index}`} id={entry.gradientId} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={entry.color1} />
                      <stop offset="100%" stopColor={entry.color2} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={filteredPieData}
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
                  {filteredPieData.map((entry, index) => (
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
                          const dataItem = filteredPieData[index];
                          return (
                            <div key={`item-${index}`} className="flex items-center gap-2 group cursor-default">
                              <div 
                                className="w-3 h-3 rounded-full shrink-0 shadow-inner group-hover:scale-125 transition-transform" 
                                style={{ backgroundColor: dataItem.dotColor }} 
                              />
                              <span className="text-xs font-semibold text-gray-600 truncate group-hover:text-gray-900 transition-colors">
                                {dataItem.value} {dataItem.name.split(' ')[0]}
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

      {/* Traffic Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-6 flex flex-col h-full min-h-[350px] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-gray-900">System Traffic</h2>
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-50 px-2 py-1 rounded-full animate-pulse">Live 24h</span>
        </div>
        
        {!trafficData || trafficData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            No traffic data available.
          </div>
        ) : (
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="70%" stopColor="#fca5a5" stopOpacity={0.1}/>
                    <stop offset="100%" stopColor="#fef2f2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="time" 
                  tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}} 
                  tickLine={false} 
                  axisLine={false} 
                  minTickGap={40} 
                  tickFormatter={(val) => typeof val === 'string' ? val.replace(/^0/, '').replace(/:\d{2}/, '') : val}
                />
                <YAxis tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}} tickLine={false} axisLine={false} />
                <Tooltip content={<TrafficTooltip />} cursor={{ stroke: '#fca5a5', strokeWidth: 2, strokeDasharray: '4 4' }} />
                <Area 
                  type="monotone" 
                  dataKey="activeUsers" 
                  stroke="#ef4444" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorTraffic)"
                  animationBegin={400}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  activeDot={{ r: 6, fill: "#fff", stroke: "#ef4444", strokeWidth: 3, shadow: "0 0 10px rgba(239, 68, 68, 0.5)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
