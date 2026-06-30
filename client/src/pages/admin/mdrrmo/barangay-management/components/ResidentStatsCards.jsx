import React from "react";

export default function ResidentStatsCards({ stats, isLoading }) {
  const { totalResidentsCount, readyCount, averageScore, coverageRate } = stats;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Monitored Residents</p>
        {isLoading ? (
          <div className="h-9 bg-gray-200 rounded w-16 mt-2 animate-pulse"></div>
        ) : (
          <p className="text-3xl font-black mt-2 font-mono text-gray-800">{totalResidentsCount}</p>
        )}
      </div>
      <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm bg-emerald-50/30">
        <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Certified Ready</p>
        {isLoading ? (
          <div className="h-9 bg-emerald-200 rounded w-16 mt-2 animate-pulse"></div>
        ) : (
          <p className="text-3xl font-black text-emerald-600 mt-2 font-mono">{readyCount}</p>
        )}
      </div>
      <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm bg-amber-50/30">
        <p className="text-[10px] text-amber-600 uppercase font-bold tracking-wider">Avg Quiz Accuracy</p>
        {isLoading ? (
          <div className="h-9 bg-amber-200 rounded w-16 mt-2 animate-pulse"></div>
        ) : (
          <p className="text-3xl font-black text-amber-600 mt-2 font-mono">{averageScore}%</p>
        )}
      </div>
      <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm bg-blue-50/30">
        <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">Coverage Rate</p>
        {isLoading ? (
          <div className="h-9 bg-blue-200 rounded w-16 mt-2 animate-pulse"></div>
        ) : (
          <p className="text-3xl font-black text-blue-600 mt-2 font-mono">{coverageRate}%</p>
        )}
      </div>
    </div>
  );
}
