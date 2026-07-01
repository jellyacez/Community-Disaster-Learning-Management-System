import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export default function SystemCharts({ stats }) {
  if (!stats) return null;

  const data = [
    { name: "Residents", value: Number(stats.resident_users || 0), color: "#9ca3af" }, // gray-400
    { name: "Barangay Admins", value: Number(stats.barangay_admin_users || 0), color: "#14b8a6" }, // teal-500
    { name: "MDRRMO Admins", value: Number(stats.mdrrmo_admin_users || 0), color: "#3b82f6" }, // blue-500
    { name: "System Admins", value: Number(stats.system_admin_users || 0), color: "#a855f7" }, // purple-500
  ];

  // Filter out any zero values so they don't clutter the chart unnecessarily
  const filteredData = data.filter(item => item.value > 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-full">
      <h2 className="text-base font-bold text-gray-900 mb-6">User Distribution</h2>
      
      {filteredData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          No user data available.
        </div>
      ) : (
        <div className="flex-1 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={filteredData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {filteredData.map((entry, index) => (
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
  );
}
