import React from "react";
import { useQuery } from "@tanstack/react-query";

const fetchModules = async () => {
  const res = await fetch("/api/admin/modules");
  if (!res.ok) throw new Error("Failed to fetch modules");
  return res.json();
};

export default function ActiveSyllabus() {
  const { data: modules = [], isLoading, isError } = useQuery({
    queryKey: ["adminModules"],
    queryFn: fetchModules,
    retry: 1
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-3 text-gray-500 font-medium">Loading Syllabus Data...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
        <p className="font-bold">Error loading syllabus data.</p>
        <p className="text-sm">Please ensure the backend routes are connected.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in duration-150">
      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100 pb-2 font-mono">
        Central Master Syllabus Reference (Read-Only View)
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="pb-3 font-semibold uppercase tracking-wider">Module Topic Protocol Title</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-center">Risk Urgency Tiers</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-right">Syllabus Flow Tasks</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-50">
            {modules.length === 0 ? (
              <tr>
                <td colSpan="3" className="py-6 text-center text-gray-400 italic">No master modules configured yet.</td>
              </tr>
            ) : (
              modules.map((mod) => (
                <tr key={mod.id || mod._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 font-semibold text-gray-800">{mod.title}</td>
                  <td className="py-4 text-center">
                    <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      mod.riskLevel === "High" ? "bg-red-50 text-red-600 border border-red-200" :
                      mod.riskLevel === "Medium" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                      "bg-blue-50 text-blue-600 border border-blue-200"
                    }`}>
                      {mod.riskLevel || "Standard"}
                    </span>
                  </td>
                  <td className="py-4 text-right font-mono font-bold text-gray-500">
                    {mod.flows?.length || 0} structural steps
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
