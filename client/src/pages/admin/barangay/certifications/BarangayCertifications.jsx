import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon, QrCodeIcon } from "@hugeicons/core-free-icons";
import apiClient from "../../../../lib/apiClient";
import CertificateVerificationModal from "../../../../components/ui/certificates/CertificateVerificationModal";
import useDebounce from "../../../../hooks/useDebounce";
import CertificationsKpiRow from "./components/CertificationsKpiRow";
import CertificationsFilterBar from "./components/CertificationsFilterBar";
import CertificationsTable from "./components/CertificationsTable";

const fetchBarangayCertifications = async ({ page, limit, search, moduleId, status }) => {
  const params = new URLSearchParams();
  if (page) params.append("page", page);
  if (limit) params.append("limit", limit);
  if (search) params.append("search", search);
  if (moduleId) params.append("moduleId", moduleId);
  if (status) params.append("status", status);

  const res = await apiClient.get(`/admin/barangay/certifications?${params.toString()}`);
  return res.data;
};

export default function BarangayCertifications() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 350);
  const limit = 10;

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedModule, selectedStatus]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["barangayCertifications", page, limit, debouncedSearch, selectedModule, selectedStatus],
    queryFn: () => fetchBarangayCertifications({
      page,
      limit,
      search: debouncedSearch,
      moduleId: selectedModule,
      status: selectedStatus,
    }),
    keepPreviousData: true,
    refetchInterval: 60000,
  });

  const certificates = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };
  const summary = data?.summary || { total: 0, active: 0, expiring_soon: 0, expired: 0, revoked: 0 };
  const modulesList = data?.modules || [];

  const handleResetFilters = () => {
    setSearchInput("");
    setSelectedModule("");
    setSelectedStatus("");
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
                <span className="text-gray-900 font-semibold">Certification Roster</span>
              </div>
            </li>
          </ol>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Resident Certification Roster
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-1">
              Track, inspect, and filter disaster preparedness certifications conferred to residents in your barangay
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setIsVerifyModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
            >
              <HugeiconsIcon icon={QrCodeIcon} className="w-4 h-4" />
              <span>Verify / Scan QR</span>
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                className={`w-4 h-4 ${isFetching ? "animate-spin text-red-600" : "text-gray-500"}`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <CertificationsKpiRow
        summary={summary}
        isLoading={isLoading}
        selectedStatus={selectedStatus}
        onStatusFilterChange={setSelectedStatus}
      />

      {/* Search & Tactical Filters Bar */}
      <CertificationsFilterBar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onClearSearch={() => setSearchInput("")}
        modulesList={modulesList}
        selectedModule={selectedModule}
        onModuleChange={setSelectedModule}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onResetFilters={handleResetFilters}
      />

      {/* Certificates Data Table */}
      <CertificationsTable
        certificates={certificates}
        meta={meta}
        isLoading={isLoading}
        isError={isError}
        error={error}
        page={page}
        limit={limit}
        onPageChange={setPage}
        hasActiveFilters={Boolean(searchInput || selectedModule || selectedStatus)}
        onResetFilters={handleResetFilters}
      />

      {/* In-Portal Certificate Verification Modal */}
      <CertificateVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
      />
    </div>
  );
}
