import { useState, useRef, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreHorizontalIcon, Archive02Icon, UserBlock01Icon } from "@hugeicons/core-free-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import ResidentRegistrySkeleton from "./ResidentRegistrySkeleton";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { BARANGAY_LIST } from "../../../../constants/barangays";
import apiClient from "../../../../lib/apiClient";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";

const fetchResidents = async () => {
  const res = await apiClient.get("/admin/residents");
  // Safely extract the resident array regardless of backend payload wrapper
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.data?.residents)) return res.data.residents;
  return [];
};

export default function ResidentRegistry() {
  

  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const queryClient = useQueryClient();
  const [selectedSector, setSelectedSector] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [modalConfig, setModalConfig] = useState({ isOpen: false, userId: null, action: null });

  const { data: residents = [], isLoading, isError } = useQuery({
    queryKey: ["adminResidents"],
    queryFn: fetchResidents,
    retry: 1,
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
    },
  });

  const filteredResidents = useMemo(() => {
    const list = Array.isArray(residents) ? residents : [];
    return list.filter((r) => {
      const matchesSector = selectedSector === "All" || r.barangay === selectedSector;
      const matchesSearch =
        r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.status?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSector && matchesSearch;
    });
  }, [residents, selectedSector, searchQuery]);

  const confirmAction = async () => {
    if (modalConfig.userId && modalConfig.action) {
      await mutation.mutateAsync({ action: modalConfig.action, userId: modalConfig.userId });
    }
    setModalConfig({ isOpen: false, userId: null, action: null });
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
    <>
      <div className="mb-8">
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">Dashboard</li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span>Resident Management</span>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span className="text-gray-900 font-semibold">Residential Compliance Registry</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Residential Compliance Registry</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">Monitor and manage resident training compliance in your barangay</p>
          </div>
        </div>
      </div>

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
              {BARANGAY_LIST.map((b) => (
                <option key={b.id} value={b.name}>Barangay {b.name}</option>
              ))}
            </select>
          </div>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full sm:w-72 p-2.5 border border-gray-200 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm" 
          />
        </div>

        {/* Registry Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50" className="bg-gray-50" className="bg-gray-50">
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="py-3 px-6 font-semibold uppercase tracking-wider">Resident</th>
                <th className="py-3 px-6 font-semibold uppercase tracking-wider">Barangay</th>
                <th className="py-3 px-6 font-semibold uppercase tracking-wider text-center">Modules Completed</th>
                <th className="py-3 px-6 font-semibold uppercase tracking-wider text-center">State</th>
                <th className="py-3 px-6 font-semibold uppercase tracking-wider text-right">Actions</th>
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
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-700">
                            {r.name?.charAt(0).toUpperCase() || "R"}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{r.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{r.id || r._id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6 font-mono text-gray-500">{r.barangay}</td>
                    <td className="py-3 px-6 text-center font-bold text-gray-700">{r.modulesCompleted || 0} Modules Completed</td>
                    <td className="py-3 px-6 text-center">
                      <StatusBadge color={
                        r.status === "banned" ? "red" :
                        r.status === "archived" ? "slate" :
                        r.status === "Ready" ? "emerald" : "amber"
                      }>
                        {r.status || "Pending"}
                      </StatusBadge>
                    </td>
                    <td className="py-3 px-6 text-right relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === (r.id || r._id) ? null : (r.id || r._id));
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <HugeiconsIcon icon={MoreHorizontalIcon} size={18} />
                      </button>
                      
                      {openDropdownId === (r.id || r._id) && (
                        <div 
                          ref={dropdownRef}
                          className="absolute right-8 top-10 w-48 bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-200/50 py-1.5 z-50 text-left animate-in zoom-in-95 duration-100"
                        >
                          <div className="px-3 py-1.5 border-b border-gray-50 mb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Manage Resident</p>
                          </div>
                          <button 
                            onClick={() => {
                              setModalConfig((r.id || r._id), "archive");
                              setOpenDropdownId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            <HugeiconsIcon icon={Archive02Icon} size={16} />
                            <span>Archive Record</span>
                          </button>
                          <button 
                            onClick={() => {
                              setModalConfig((r.id || r._id), "ban");
                              setOpenDropdownId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <HugeiconsIcon icon={UserBlock01Icon} size={16} />
                            <span>Ban Resident</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false, userId: null, action: null })}
        onConfirm={confirmAction}
        title={`Confirm ${modalConfig.action === 'ban' ? 'Ban' : 'Archive'}`}
        description={`Are you sure you want to ${modalConfig.action} this resident? This action cannot be easily undone.`}
        confirmText={`Yes, ${modalConfig.action}`}
        cancelText="Cancel"
        type={modalConfig.action === 'ban' ? 'danger' : 'warning'}
        isLoading={mutation.isPending}
      />
    </>
  );
}