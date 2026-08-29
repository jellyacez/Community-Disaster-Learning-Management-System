import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import apiClient from "../../../../lib/apiClient";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";
import useDebounce from "../../../../hooks/useDebounce";
import ResidentRegistryFilterBar from "./components/ResidentRegistryFilterBar";
import ResidentRegistryTable from "./components/ResidentRegistryTable";

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
  const [modalConfig, setModalConfig] = useState({ isOpen: false, userId: null, action: null });

  const debouncedSearch = useDebounce(searchInput, 350);
  const limit = 10;
  const queryClient = useQueryClient();

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedStatus]);

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

  const handleOpenActionModal = (userId, action) => {
    setModalConfig({ isOpen: true, userId, action });
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
            type="button"
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

      {/* Filter and Search Bar */}
      <ResidentRegistryFilterBar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onClearSearch={() => setSearchInput("")}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {/* Registry Table */}
      <ResidentRegistryTable
        residents={residents}
        meta={meta}
        isLoading={isLoading}
        isError={isError}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onOpenActionModal={handleOpenActionModal}
      />

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