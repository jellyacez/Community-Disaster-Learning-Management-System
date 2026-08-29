import { HugeiconsIcon } from "@hugeicons/react";
import {
  Award01Icon,
  CancelCircleIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { SkeletonTableRow } from "../../../../../components/ui/Skeleton";
import CertificateLifecycleBadge from "../../../../../components/ui/certificates/CertificateLifecycleBadge";

export default function CertificationsTable({
  certificates = [],
  meta = { total: 0, page: 1, limit: 10, totalPages: 1 },
  isLoading = false,
  isError = false,
  error = null,
  page = 1,
  limit = 10,
  onPageChange,
  hasActiveFilters = false,
  onResetFilters,
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "N/A"
      : d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  };

  return (
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
            {hasActiveFilters
              ? "No certification records match the selected search terms or tactical filters."
              : "No residents in this barangay have earned module certificates yet."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
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

                      {/* Status Badge */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <CertificateLifecycleBadge status={cert.computed_status} />
                        {cert.computed_status === "revoked" && cert.revocation_reason && (
                          <div
                            className="text-[10px] text-gray-400 mt-1 max-w-[150px] truncate mx-auto"
                            title={cert.revocation_reason}
                          >
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
              type="button"
              onClick={() => onPageChange(Math.max(page - 1, 1))}
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
              type="button"
              onClick={() => onPageChange(Math.min(page + 1, meta.totalPages))}
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
  );
}
