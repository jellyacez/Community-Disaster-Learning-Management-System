import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Award01Icon,
  Search01Icon,
  RefreshIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  CancelCircleIcon,
  UnavailableIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import apiClient from "../../../../lib/apiClient";
import CertificateLifecycleBadge from "../../../../components/ui/certificates/CertificateLifecycleBadge";

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
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const limit = 10;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["barangayCertifications", page, limit, search, selectedModule, selectedStatus],
    queryFn: () => fetchBarangayCertifications({
      page,
      limit,
      search,
      moduleId: selectedModule,
      status: selectedStatus,
    }),
    keepPreviousData: true,
  });

  const certificates = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };
  const summary = data?.summary || { total: 0, active: 0, expiring_soon: 0, expired: 0, revoked: 0 };
  const modulesList = data?.modules || [];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const handleStatusFilterChange = (statusVal) => {
    setSelectedStatus(statusVal);
    setPage(1);
  };

  const handleModuleFilterChange = (modVal) => {
    setSelectedModule(modVal);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearch("");
    setSelectedModule("");
    setSelectedStatus("");
    setPage(1);
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
            <li className="inline-flex items-center text-gray-400">/</li>
            <li className="inline-flex items-center">Community Oversight</li>
            <li className="inline-flex items-center text-gray-400">/</li>
            <li className="inline-flex items-center font-medium text-gray-900">
              Certification Roster
            </li>
          </ol>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <HugeiconsIcon icon={Award01Icon} className="w-7 h-7 text-red-600" />
              Resident Certification Roster
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track, inspect, and filter disaster preparedness certifications conferred to residents in your barangay.
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

      {/* KPI Metric Summary Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* All */}
        <button
          onClick={() => handleStatusFilterChange("")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === ""
              ? "bg-red-50/50 border-red-300 ring-2 ring-red-500/20"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Certs</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</div>
        </button>

        {/* Active */}
        <button
          onClick={() => handleStatusFilterChange("active")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === "active"
              ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
            Active
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{summary.active}</div>
        </button>

        {/* Expiring Soon */}
        <button
          onClick={() => handleStatusFilterChange("expiring_soon")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === "expiring_soon"
              ? "bg-amber-50 border-amber-300 ring-2 ring-amber-500/20"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700">
            <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5" />
            Expiring Soon
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{summary.expiring_soon}</div>
        </button>

        {/* Expired */}
        <button
          onClick={() => handleStatusFilterChange("expired")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === "expired"
              ? "bg-red-50 border-red-300 ring-2 ring-red-500/20"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-700">
            <HugeiconsIcon icon={CancelCircleIcon} className="w-3.5 h-3.5" />
            Expired
          </div>
          <div className="text-2xl font-bold text-red-900 mt-1">{summary.expired}</div>
        </button>

        {/* Revoked */}
        <button
          onClick={() => handleStatusFilterChange("revoked")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === "revoked"
              ? "bg-gray-100 border-gray-400 ring-2 ring-gray-400/20"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-700">
            <HugeiconsIcon icon={UnavailableIcon} className="w-3.5 h-3.5" />
            Revoked
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{summary.revoked}</div>
        </button>
      </div>

      {/* Tactical Deployment Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by resident name, email, cert #, or module..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
            </button>
          )}
        </form>

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
          {(search || selectedModule || selectedStatus) && (
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
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-medium text-gray-500">Loading certification roster...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center bg-red-50/50">
            <HugeiconsIcon icon={CancelCircleIcon} className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <p className="font-semibold text-red-800">Failed to load certification records</p>
            <p className="text-xs text-red-600 mt-1">{error?.response?.data?.error || error?.message}</p>
          </div>
        ) : certificates.length === 0 ? (
          <div className="p-12 text-center">
            <HugeiconsIcon icon={Award01Icon} className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 text-base">No certificates found</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {search || selectedModule || selectedStatus
                ? "No certification records match the selected search terms or tactical filters."
                : "No residents in this barangay have earned module certificates yet."}
            </p>
            {(search || selectedModule || selectedStatus) && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" className="px-6 py-4">Resident</th>
                  <th scope="col" className="px-6 py-4">Module Details</th>
                  <th scope="col" className="px-6 py-4">Control No.</th>
                  <th scope="col" className="px-6 py-4">Issued</th>
                  <th scope="col" className="px-6 py-4">Expires</th>
                  <th scope="col" className="px-6 py-4 text-center">Lifecycle Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {certificates.map((cert) => (
                  <tr key={cert.cert_id} className="hover:bg-gray-50/75 transition-colors">
                    {/* Resident */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{cert.resident_name}</div>
                      <div className="text-xs text-gray-500">{cert.resident_email}</div>
                    </td>

                    {/* Module */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{cert.module_title}</div>
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
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {formatDate(cert.completion_date)}
                    </td>

                    {/* Expires Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
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
    </div>
  );
}
