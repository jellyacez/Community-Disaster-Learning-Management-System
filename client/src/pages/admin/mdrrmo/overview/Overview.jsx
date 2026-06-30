import React from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import apiClient from "../../../../lib/apiClient";
import { SkeletonTableRow } from "../../../../components/ui/Skeleton.jsx";

// Contract-first API fetchers
const fetchModules = async () => {
  const res = await apiClient.get("/admin/modules");
  return res.data;
};

const fetchUsers = async () => {
  const res = await apiClient.get("/admin/users");
  return res.data;
};

const fetchLogs = async () => {
  const res = await apiClient.get("/admin/logs");
  return res.data;
};

export default function Overview() {
  // Utilizing React Query for state management, loading, and error handling
  const { data: modules = [], isLoading: isLoadingModules, isError: isErrorModules } = useQuery({
    queryKey: ["adminModules"],
    queryFn: fetchModules,
    retry: 1
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: fetchUsers,
    retry: 1
  });

  const { data: systemLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["adminLogs"],
    queryFn: fetchLogs,
    retry: 1
  });

  const isLoading = isLoadingModules || isLoadingUsers || isLoadingLogs;

  if (isErrorModules) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
        <p className="font-bold">Error loading overview data.</p>
        <p className="text-sm">Please ensure the backend routes are connected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Active Modules</p>
          {isLoadingModules ? (
            <div className="h-10 bg-gray-200 rounded w-16 mt-2 animate-pulse"></div>
          ) : (
            <p className="text-4xl font-black mt-2 font-mono text-gray-800">{modules.length}</p>
          )}
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Registered Responders</p>
          {isLoadingUsers ? (
            <div className="h-10 bg-gray-200 rounded w-16 mt-2 animate-pulse"></div>
          ) : (
            <p className="text-4xl font-black mt-2 font-mono text-gray-800">{users.length}</p>
          )}
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm w-full flex items-center justify-between" style={{ borderLeft: "4px solid #10b981", backgroundColor: "#f0fdf4" }}>
          <div>
            <p className="text-xs text-emerald-700 uppercase font-bold tracking-wider">System Status</p>
            <p className="text-xl font-black text-emerald-800 font-mono mt-1">NORMAL / READY</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <HugeiconsIcon icon={Alert01Icon} className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Modules Table */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 w-full">
          <h3 className="text-xs font-bold uppercase tracking-wide mb-4 text-gray-400 border-b border-gray-100 pb-2 font-mono">
            Active Master Modules
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-3 font-semibold uppercase tracking-wider">Module Topic</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-center">Steps Inside</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-center">Visibility</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-50">
                {isLoadingModules ? (
                  [1, 2, 3].map((i) => <SkeletonTableRow key={i} columns={3} />)
                ) : modules.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-6 text-center text-gray-400 italic">No modules available</td>
                  </tr>
                ) : (
                  modules.map((mod) => (
                    <tr key={mod.id || mod._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 font-semibold max-w-[160px] truncate text-gray-800">{mod.title}</td>
                      <td className="py-3 text-center font-mono text-gray-500 font-bold">{mod.flows?.length || 0} Steps</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          mod.status === "Private" ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        }`}>
                          {mod.status || "Public"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Logs */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100 pb-2 font-mono">
            Security Web Audit Logs
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {isLoadingLogs ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl text-xs flex flex-col gap-2 shadow-sm animate-pulse">
                   <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                   <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              ))
            ) : systemLogs.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">No audit logs found</p>
            ) : (
              systemLogs.map((log) => (
                <div key={log.id || log._id} className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl text-xs flex flex-col gap-1">
                  <div className="flex justify-between font-mono text-[10px] text-gray-400">
                    <span className="font-bold text-gray-600">{log.source}</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <span className="text-gray-700 font-medium leading-relaxed">{log.log}</span>
                </div>
              ))
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
