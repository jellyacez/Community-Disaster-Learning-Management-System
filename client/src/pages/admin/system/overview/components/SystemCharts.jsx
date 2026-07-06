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

  const pieData = [
    { name: "Residents", value: Number(stats.resident_users || 0), color: "#9ca3af" }, // gray-400
    { name: "Barangay Admins", value: Number(stats.barangay_admin_users || 0), color: "#14b8a6" }, // teal-500
    { name: "MDRRMO Admins", value: Number(stats.mdrrmo_admin_users || 0), color: "#3b82f6" }, // blue-500
    { name: "System Admins", value: Number(stats.system_admin_users || 0), color: "#a855f7" }, // purple-500
  ];

  const filteredPieData = pieData.filter(item => item.value > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full h-full">
      {/* User Distribution */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-full min-h-[350px]">
        <h2 className="text-base font-bold text-gray-900 mb-6">User Distribution</h2>
        
        {filteredPieData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            No user data available.
          </div>
        ) : (
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {filteredPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Traffic Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-full min-h-[350px]">
        <h2 className="text-base font-bold text-gray-900 mb-6">System Traffic (24h)</h2>
        
        {!trafficData || trafficData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            No traffic data available.
          </div>
        ) : (
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="time" tick={{fontSize: 10, fill: '#9ca3af'}} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="activeUsers" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
