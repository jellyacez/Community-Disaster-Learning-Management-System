import { useState, useRef, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreHorizontalIcon,
  Archive02Icon,
  UserBlock01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import StatusBadge from "../../../../components/ui/StatusBadge";
import SearchBar from "../../../../components/ui/inputs/SearchBar";
import { SkeletonTableRow } from "../../../../components/ui/Skeleton";
import apiClient from "../../../../lib/apiClient";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";
import useDebounce from "../../../../hooks/useDebounce";

const fetchResidents = async ({ page, limit, search, status }) => {
  const params = new URLSearchParams();
  if (page) params.append("page", page);
  if (limit) params.append("limit", limit);
  if (search) params.append("search", search);
  if (status) params.append("status", status);

  const res = await apiClient.get(`/admin/residents?${params.toString()}`);
  return res.data;
};

export default function ResidentRegistry() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  const debouncedSearch = useDebounce(searchInput, 350);
  const limit = 10;
  const queryClient = useQueryClient();

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedStatus]);

  // Close dropdown menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [modalConfig, setModalConfig] = useState({ isOpen: false, userId: null, action: null });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["adminResidents", page, limit, debouncedSearch, selectedStatus],
    queryFn: () => fetchResidents({
      page,
      limit,
      search: debouncedSearch,
      status: selectedStatus,
    }),
    keepPreviousData: true,
  });

  const residents = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

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

  const confirmAction = async () => {
    if (modalConfig.userId && modalConfig.action) {
      await mutation.mutateAsync({ action: modalConfig.action, userId: modalConfig.userId });
    }
    setModalConfig({ isOpen: false, userId: null, action: null });
  };

  const handleClearSearch = () => {
    setSearchInput("");
  };

  const handleStatusFilterChange = (statusVal) => {
    setSelectedStatus(statusVal);
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumbs */}
      <div>
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

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Residential Compliance Registry
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-1">
              Monitor and manage resident training compliance in your barangay
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm self-start md:self-auto cursor-pointer"
          >
            <HugeiconsIcon
              icon={RefreshIcon}
              className={`w-4 h-4 ${isFetching ? "animate-spin text-red-600" : "text-gray-500"}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Aligned with Certification Roster standard) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Reusable SearchBar Component */}
        <SearchBar
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onClear={handleClearSearch}
          placeholder="Search by resident name or email..."
          ariaLabel="Search residents"
          containerClassName="relative flex-1"
        />

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Registry Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-150">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Resident</th>
                <th className="py-3.5 px-6">Barangay</th>
                <th className="py-3.5 px-6 text-center">Modules Completed</th>
                <th className="py-3.5 px-6 text-center">State</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={5} hasAvatar={true} padding="py-4 px-6" />
                ))
              ) : isError ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-red-500 font-medium">
                    Error loading resident records. Please check your connection and try again.
                  </td>
                </tr>
              ) : residents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-400 italic">
                    No resident profiles found matching your search.
                  </td>
                </tr>
              ) : (
                residents.map((r) => (
                  <tr key={r.id || r._id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Resident Info: Avatar + Name + Email subtitle */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 font-bold text-xs">
                          {r.name?.charAt(0).toUpperCase() || "R"}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 leading-tight block">
                            {r.name}
                          </span>
                          <span className="text-xs text-gray-500 font-normal block mt-0.5">
                            {r.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Barangay */}
                    <td className="py-4 px-6 text-sm font-medium text-gray-600">
                      {r.barangay || "N/A"}
                    </td>

                    {/* Modules Completed */}
                    <td className="py-4 px-6 text-center font-bold text-gray-900 text-sm">
                      {r.modulesCompleted ?? 0} {r.modulesCompleted === 1 ? "Module" : "Modules"} Completed
                    </td>

                    {/* Account Standing State */}
                    <td className="py-4 px-6 text-center">
                      {r.banned ? (
                        <StatusBadge color="red">Banned</StatusBadge>
                      ) : r.archived ? (
                        <StatusBadge color="slate">Archived</StatusBadge>
                      ) : (
                        <StatusBadge color="emerald">Active</StatusBadge>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-4 px-6 text-right relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === (r.id || r._id) ? null : (r.id || r._id));
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        aria-label="Manage resident actions"
                      >
                        <HugeiconsIcon icon={MoreHorizontalIcon} size={18} />
                      </button>

                      {openDropdownId === (r.id || r._id) && (
                        <div
                          ref={dropdownRef}
                          className="absolute right-6 top-12 w-48 bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-200/50 py-1.5 z-50 text-left animate-in zoom-in-95 duration-100"
                        >
                          <div className="px-3 py-1.5 border-b border-gray-50 mb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Manage Resident</p>
                          </div>
                          <button
                            onClick={() => {
                              setModalConfig({ isOpen: true, userId: (r.id || r._id), action: "archive" });
                              setOpenDropdownId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <HugeiconsIcon icon={Archive02Icon} size={16} />
                            <span>Archive Record</span>
                          </button>
                          <button
                            onClick={() => {
                              setModalConfig({ isOpen: true, userId: (r.id || r._id), action: "ban" });
                              setOpenDropdownId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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

        {/* Standardized Pagination Footer */}
        {!isLoading && !isError && meta.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
            <span className="text-xs text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-700">{meta.total > 0 ? (page - 1) * limit + 1 : 0}</span> to{" "}
              <span className="font-bold text-gray-700">{Math.min(page * limit, meta.total)}</span> of{" "}
              <span className="font-bold text-gray-700">{meta.total}</span> residents
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer flex items-center gap-1"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3.5 h-3.5" />
                Previous
              </button>
              <span className="text-xs font-medium text-gray-600 px-2">
                Page {page} of {meta.totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages || 1))}
                disabled={page >= (meta.totalPages || 1)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer flex items-center gap-1"
              >
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
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
    </div>
  );
}