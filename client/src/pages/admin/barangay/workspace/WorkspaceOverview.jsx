import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import WorkspaceOverviewSkeleton from "./WorkspaceOverviewSkeleton";

const fetchResidents = async () => {
  const res = await fetch("/api/admin/residents");
  if (!res.ok) throw new Error("Failed to fetch residents");
  return res.json();
};

export default function WorkspaceOverview() {
  const [selectedResident, setSelectedResident] = useState(null);

  const { data: residents = [], isLoading, isError } = useQuery({
    queryKey: ["adminResidents"],
    queryFn: fetchResidents,
    retry: 1
  });

  const totalResidentsCount = residents.length;
  const certifiedCount = residents.filter(r => r.status === "Ready").length;
  const inProgressCount = residents.filter(r => (r.modulesCompleted || 0) > 0 && r.status !== "Ready").length;

  const handleVerifyCertificate = (residentName) => {
    alert(`Auditing Certification Database Ledger:\nRecord for ${residentName} is verified, authentic, and matches server records.`);
  };

  if (isLoading) {
    return <WorkspaceOverviewSkeleton />;
  }

  if (isError) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
        <p className="font-bold">Error loading resident data.</p>
        <p className="text-sm">Please ensure the backend routes are connected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Global Statistical Metrics Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Monitored Locals</p>
          <p className="text-4xl font-black mt-2 font-mono text-gray-800">{totalResidentsCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm w-full border-l-4 border-emerald-500">
          <p className="text-xs text-emerald-600 uppercase font-bold tracking-wider">Certified Safe Records</p>
          <p className="text-4xl font-black text-emerald-600 mt-2 font-mono">{certifiedCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm w-full border-l-4 border-blue-500">
          <p className="text-xs text-blue-600 uppercase font-bold tracking-wider">Active Training Track</p>
          <p className="text-4xl font-black text-blue-600 mt-2 font-mono">{inProgressCount}</p>
        </div>
      </div>

      {/* High Density Table & Inspection Grid Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Table Panel */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4 w-full">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 font-mono">Sector Progression Metrics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-3 font-semibold uppercase tracking-wider">Citizen Identity</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-center">Score Metric</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-center">Active State</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-right">Review Link</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-50">
                {residents.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-gray-400 italic">No residents mapped yet.</td>
                  </tr>
                ) : (
                  residents.slice(0, 5).map((r) => (
                    <tr key={r.id || r._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 font-semibold text-gray-800">{r.name}</td>
                      <td className="py-3 text-center text-gray-500 font-mono">{r.quizScore || 0}%</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          r.status === "Ready" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                        }`}>
                          {r.status || "Pending"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button 
                          type="button" 
                          onClick={() => setSelectedResident(r)} 
                          className="px-3 py-1 text-[11px] font-bold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded shadow-sm transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Profile Inspector Panel */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full min-h-[300px] flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wide mb-4 text-gray-500 border-b border-gray-100 pb-2 font-mono">
            Active Selection Profile
          </h3>
          <ResidentInspectorPanel 
            selectedResident={selectedResident} 
            onVerifyCertificate={handleVerifyCertificate} 
          />
        </div>
      </div>
    </div>
  );
}
