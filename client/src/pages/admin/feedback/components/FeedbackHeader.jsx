import { HugeiconsIcon } from "@hugeicons/react";
import { FilterIcon } from "@hugeicons/core-free-icons";
import { BARANGAY_LIST } from "../../../../constants/barangays";

export default function FeedbackHeader({
  isMdrrmoOrSystem,
  selectedBarangayFilter,
  setSelectedBarangayFilter,
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
      <div>
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">Dashboard</li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span>Dashboard & Monitoring</span>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span className="text-gray-900 font-semibold">
                  {isMdrrmoOrSystem ? "Resident Feedbacks" : "Resident Feedbacks"}
                </span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="text-3xl font-extrabold text-gray-900">
          {isMdrrmoOrSystem ? "MDRRMO Municipal Feedback Desk" : "Barangay Feedback Desk"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {isMdrrmoOrSystem
            ? "Review communications across all municipal barangays."
            : "Review communications submitted by residents in your barangay."}
        </p>
      </div>

      {/* BARANGAY FILTER (ONLY VISIBLE FOR MDRRMO / SYSTEM ADMIN) */}
      {isMdrrmoOrSystem && (
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-sm">
          <HugeiconsIcon icon={FilterIcon} className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-bold text-gray-500 uppercase">Barangay:</span>
          <select
            value={selectedBarangayFilter}
            onChange={(e) => setSelectedBarangayFilter(e.target.value)}
            className="bg-transparent text-sm font-bold text-gray-800 focus:outline-none cursor-pointer"
          >
            <option value="all">All Barangays (Municipal View)</option>
            {BARANGAY_LIST.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
