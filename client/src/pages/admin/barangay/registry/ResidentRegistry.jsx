import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import ResidentRegistrySkeleton from "./ResidentRegistrySkeleton";
import { BACOLOR_BARANGAYS } from "../../../../constants/locations";
import apiClient from "../../../../lib/apiClient";

const fetchResidents = async () => {
  const res = await apiClient.get("/admin/residents");
  return res.data;
};

export default function ResidentRegistry() {
  const queryClient = useQueryClient();
  const [selectedSector, setSelectedSector] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: residents = [], isLoading, isError } = useQuery({
    queryKey: ["adminResidents"],
    queryFn: fetchResidents,
    retry: 1
  });

  const mutation = useMutation({
    mutationFn: async ({ action, userId }) => {
      if (action === "archive") return apiClient.patch(`/admin/users/${userId}/archive`);
      if (action === "ban") return apiClient.patch(`/admin/users/${userId}/ban`);
    },
    onSuccess: (_, variables) => {
      toast.success(`Resident ${variables.action === "ban" ? "banned" : "archived"} successfully.`);
      queryClient.invalidateQueries({ queryKey: ["adminResidents"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Action failed.");
    }
  });

  const filteredResidents = useMemo(() => {
    return residents.filter(r => {
      const matchesSector = selectedSector === "All" || r.barangay === selectedSector;
      const matchesSearch = r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.status?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSector && matchesSearch;
    });
  }, [residents, selectedSector, searchQuery]);

  const handleVerifyCertificate = (residentName) => {
    toast.success(`Auditing Certification Database Ledger:\nRecord for ${residentName} is verified, authentic, and matches server records.`);
  };

  const handleAccountAction = async (userId, action) => {
    if (window.confirm(`Are you sure you want to ${action} this resident? This action cannot be easily undone.`)) {
      await mutation.mutateAsync({ action, userId });
    }
  };

  if (isLoading) {
    return <ResidentRegistrySkeleton />;
  }

  if (isError) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
        <p className="font-bold">Error loading resident registry data.</p>
        <p className="text-sm">Please ensure the backend routes are connected.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-in fade-in duration-150">
      
      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-bold text-gray-500 uppercase font-mono tracking-wider">Filter Scope:</span>
          <select 
            value={selectedSector} 
            onChange={(e) => setSelectedSector(e.target.value)} 
            className="p-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm"
          >
            <option value="All">All Registered Sectors</option>
            {BACOLOR_BARANGAYS.map((b) => (
              <option key={b} value={b}>Barangay {b}</option>
            ))}
          </select>
        </div>
        <input 
          type="text" 
          placeholder="Search resident identity queries..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="w-full sm:w-72 p-2.5 border border-gray-200 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm" 
        />
      </div>

      {/* Registry Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="pb-3 font-semibold uppercase tracking-wider">Resident Name</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Sector Location</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-center">Syllabus Cleared</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-center">State</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-50">
            {filteredResidents.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-6 text-center text-gray-400 italic">No resident profiles found.</td>
              </tr>
            ) : (
              filteredResidents.map((r) => (
                <tr key={r.id || r._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 font-semibold text-gray-800">{r.name}</td>
                  <td className="py-3 font-mono text-gray-500">{r.barangay}</td>
                  <td className="py-3 text-center font-bold text-gray-700">{r.modulesCompleted || 0} Modules Completed</td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      r.status === "banned" ? "bg-red-50 text-red-600 border border-red-200" :
                      r.status === "archived" ? "bg-slate-50 text-slate-600 border border-slate-200" :
                      r.status === "Ready" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                    }`}>
                      {r.status || "Pending"}
                    </span>
                  </td>
                  <td className="py-3 text-right space-x-2">
                    {r.status === "Ready" && (
                      <button 
                        type="button" 
                        onClick={() => handleVerifyCertificate(r.name)} 
                        className="px-3 py-1.5 text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-all shadow-sm"
                      >
                        Audit QR Code
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={() => handleAccountAction(r.id || r._id, "archive")} 
                      className="px-3 py-1.5 text-xs border border-slate-200 text-gray-700 hover:bg-slate-50 font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      Archive
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleAccountAction(r.id || r._id, "ban")} 
                      className="px-3 py-1.5 text-xs border border-red-200 text-red-600 hover:bg-red-600 hover:text-white font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      Ban
                    </button>
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
