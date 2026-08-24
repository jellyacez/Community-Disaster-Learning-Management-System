import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Award01Icon,
  RefreshIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  CancelCircleIcon,
  UnavailableIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  QrCodeIcon,
} from "@hugeicons/core-free-icons";
import apiClient from "../../../../lib/apiClient";
import StatCard from "../../../../components/ui/StatCard";
import SearchBar from "../../../../components/ui/inputs/SearchBar";
import { SkeletonTableRow } from "../../../../components/ui/Skeleton";
import CertificateLifecycleBadge from "../../../../components/ui/certificates/CertificateLifecycleBadge";
import CertificateVerificationModal from "../../../../components/ui/certificates/CertificateVerificationModal";
import useDebounce from "../../../../hooks/useDebounce";

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
    refetchInterval: 60000, // Background polling every 60s without disrupting active filters/scroll
  });

  const certificates = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };
  const summary = data?.summary || { total: 0, active: 0, expiring_soon: 0, expired: 0, revoked: 0 };
  const modulesList = data?.modules || [];

  const handleClearSearch = () => {
    setSearchInput("");
  };

  const handleStatusFilterChange = (statusVal) => {
    setSelectedStatus(statusVal);
  };

  const handleModuleFilterChange = (modVal) => {
    setSelectedModule(modVal);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSelectedModule("");
    setSelectedStatus("");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
              onClick={() => setIsVerifyModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
            >
              <HugeiconsIcon icon={QrCodeIcon} className="w-4 h-4" />
              <span>Verify / Scan QR</span>
            </button>
            <button
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

      {/* Standardized StatCard KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Certified */}
        <StatCard
          icon={Award01Icon}
          color="blue"
          label="Total Certified"
          value={summary.total}
          sub="Conferred certificates"
          loading={isLoading}
          onClick={() => handleStatusFilterChange("")}
          isActive={selectedStatus === ""}
        />

        {/* Active */}
        <StatCard
          icon={CheckmarkCircle01Icon}
          color="green"
          label="Active"
          value={summary.active}
          sub="Valid & compliant"
          loading={isLoading}
          onClick={() => handleStatusFilterChange("active")}
          isActive={selectedStatus === "active"}
        />

        {/* Expiring Soon */}
        <StatCard
          icon={Clock01Icon}
          color="amber"
          label="Expiring Soon"
          value={summary.expiring_soon}
          sub="Expires in < 30 days"
          loading={isLoading}
          onClick={() => handleStatusFilterChange("expiring_soon")}
          isActive={selectedStatus === "expiring_soon"}
        />

        {/* Expired */}
        <StatCard
          icon={CancelCircleIcon}
          color="red"
          label="Expired"
          value={summary.expired}
          sub="Action required / re-train"
          loading={isLoading}
          onClick={() => handleStatusFilterChange("expired")}
          isActive={selectedStatus === "expired"}
        />

        {/* Revoked */}
        <StatCard
          icon={UnavailableIcon}
          color="gray"
          label="Revoked"
          value={summary.revoked}
          sub="Admin revoked"
          loading={isLoading}
          onClick={() => handleStatusFilterChange("revoked")}
          isActive={selectedStatus === "revoked"}
        />
      </div>

      {/* Tactical Deployment Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Reusable SearchBar Component */}
        <SearchBar
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onClear={handleClearSearch}
          placeholder="Search by resident name, email, cert #, or module..."
          ariaLabel="Search certifications"
          containerClassName="relative flex-1"
        />

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Module Filter */}
          <div className="relative min-w-[200px]">
            <select
              value={selectedModule}
              onChange={(e) => handleModuleFilterChange(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            >
              <option value="">All Training Modules</option>
              {modulesList.map((m) => (
                <option key={m.mod_id} value={m.mod_id}>
                  {m.modname}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(searchInput || selectedModule || selectedStatus) && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isError ? (
          <div className="p-8 text-center bg-red-50/50">
            <HugeiconsIcon icon={CancelCircleIcon} className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <p className="font-semibold text-red-800">Failed to load certification records</p>
            <p className="text-xs text-red-600 mt-1">{error?.response?.data?.error || error?.message}</p>
          </div>
        ) : !isLoading && certificates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <HugeiconsIcon icon={Award01Icon} className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-900 text-base">No certificates found</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchInput || selectedModule || selectedStatus
                ? "No certification records match the selected search terms or tactical filters."
                : "No residents in this barangay have earned module certificates yet."}
            </p>
            {(searchInput || selectedModule || selectedStatus) && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th scope="col" className="px-6 py-4 font-semibold text-sm">Resident</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-sm">Module Details</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-sm">Control No.</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-sm">Issued</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-sm">Expires</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-sm text-center">Lifecycle Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading
                  ? [1, 2, 3, 4, 5, 6].map((i) => (
                      <SkeletonTableRow key={i} columns={6} hasAvatar={true} />
                    ))
                  : certificates.map((cert) => (
                      <tr key={cert.cert_id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Resident */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 text-sm">{cert.resident_name}</div>
                          <div className="text-xs text-gray-500">{cert.resident_email}</div>
                        </td>

                        {/* Module */}
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 text-sm">{cert.module_title}</div>
                          {cert.module_category && (
                            <span className="inline-block mt-0.5 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {cert.module_category}
                            </span>
                          )}
                        </td>

                        {/* Control No */}
                        <td className="px-6 py-4 font-mono text-xs text-gray-700 font-semibold">
                          {cert.cert_rec}
                        </td>

                        {/* Issued Date */}
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(cert.completion_date)}
                        </td>

                        {/* Expires Date */}
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <span className={cert.computed_status === 'expiring_soon' ? 'text-amber-700 font-semibold' : cert.computed_status === 'expired' ? 'text-red-700 font-semibold' : 'text-gray-600'}>
                            {formatDate(cert.expires_at)}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <CertificateLifecycleBadge status={cert.computed_status} />
                          {cert.computed_status === 'revoked' && cert.revocation_reason && (
                            <div className="text-[10px] text-gray-400 mt-1 max-w-[150px] truncate mx-auto" title={cert.revocation_reason}>
                              {cert.revocation_reason}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && !isError && certificates.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Showing <span className="font-medium text-gray-900">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-medium text-gray-900">
                {Math.min(page * limit, meta.total)}
              </span>{" "}
              of <span className="font-medium text-gray-900">{meta.total}</span> certificates
            </p>
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
                Page {page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
                disabled={page >= meta.totalPages}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer flex items-center gap-1"
              >
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* In-Portal Certificate Verification & QR Scanner Modal */}
      <CertificateVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
      />
    </div>
  );
}
