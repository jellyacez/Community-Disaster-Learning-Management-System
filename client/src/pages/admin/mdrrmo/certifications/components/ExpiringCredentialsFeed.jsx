import SearchBar from "../../../../../components/ui/inputs/SearchBar";
import CertificateLifecycleBadge from "../../../../../components/ui/certificates/CertificateLifecycleBadge";
import { SkeletonTableRow } from "../../../../../components/ui/Skeleton";
import { BARANGAY_LIST } from "../../../../../constants/barangays";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CancelCircleIcon,
  Award01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

export default function ExpiringCredentialsFeed({
  feedQuery,
  modules = [],
}) {
  const {
    data,
    isLoading,
    isError,
    error,
    page,
    setPage,
    searchInput,
    setSearchInput,
    selectedBarangay,
    setSelectedBarangay,
    selectedModule,
    setSelectedModule,
    selectedStatus,
    setSelectedStatus,
    handleResetFilters,
    hasActiveFilters,
  } = feedQuery;

  const certificates = data?.certificates || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1, limit: 10 };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header & Description */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          Expiring Credentials & Municipal Compliance Feed
        </h2>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          Live monitor of certifications needing renewal, expired credentials, and compliance actions across Bacolor
        </p>
      </div>

      {/* Tactical Deployment Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Reusable SearchBar Component */}
        <SearchBar
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onClear={() => setSearchInput("")}
          placeholder="Search by resident name, email, cert #, or module..."
          ariaLabel="Search municipal certification records"
          containerClassName="relative flex-1"
        />

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Barangay Filter */}
          <div className="relative min-w-[170px]">
            <select
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            >
              <option value="">All Barangays</option>
              {BARANGAY_LIST.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Module Filter */}
          <div className="relative min-w-[200px]">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            >
              <option value="">All Training Modules</option>
              {modules.map((m) => (
                <option key={m.module_id} value={m.module_id}>
                  {m.module_title}
                </option>
              ))}
            </select>
          </div>

          {/* Lifecycle Status Filter */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 rounded-xl hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Action Table Shell (Matches ActivityLogTable.jsx exactly) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isError ? (
          <div className="p-8 text-center bg-red-50/50">
            <HugeiconsIcon icon={CancelCircleIcon} className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <p className="font-semibold text-red-800">Failed to load certification feed</p>
            <p className="text-xs text-red-600 mt-1">{error?.response?.data?.error || error?.message}</p>
          </div>
        ) : !isLoading && certificates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <HugeiconsIcon icon={Award01Icon} className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-900 text-base">No certificates found</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? "No certification records match the selected filters or search terms."
                : "No certificates found in the municipal registry."}
            </p>
            {hasActiveFilters && (
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
                  <th scope="col" className="px-6 py-4 font-semibold text-sm">Resident & Barangay</th>
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
                        {/* Resident & Barangay */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 text-sm">{cert.resident_name}</div>
                          <div className="text-xs text-gray-500">{cert.resident_email}</div>
                          <div className="mt-1">
                            <span className="inline-block text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              {cert.barangay_name || "Unassigned"}
                            </span>
                          </div>
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
                          <span
                            className={
                              cert.computed_status === "expiring_soon"
                                ? "text-amber-700 font-semibold"
                                : cert.computed_status === "expired"
                                ? "text-red-700 font-semibold"
                                : "text-gray-600"
                            }
                          >
                            {formatDate(cert.expires_at)}
                          </span>
                        </td>

                        {/* Lifecycle Status Badge */}
                        <td className="px-6 py-4 text-center">
                          <CertificateLifecycleBadge status={cert.computed_status} />
                          {cert.computed_status === "revoked" && cert.revocation_reason && (
                            <p className="text-[10px] text-gray-400 mt-1 italic truncate max-w-[180px] mx-auto">
                              {cert.revocation_reason}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        {!isLoading && !isError && certificates.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
            <div className="text-xs text-gray-500 font-medium">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-gray-900">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of <span className="font-semibold text-gray-900">{pagination.total}</span> certificates
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(page - 1, 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3.5 h-3.5" />
                Previous
              </button>
              <span className="text-xs font-semibold text-gray-600 px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(page + 1, pagination.totalPages))}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
              >
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
