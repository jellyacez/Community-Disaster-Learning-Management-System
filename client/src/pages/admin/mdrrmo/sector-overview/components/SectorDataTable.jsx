import { useState, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, ArrowUp01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { SkeletonTableRow } from "../../../../../components/ui/Skeleton";

export default function SectorDataTable({
  sectorData,
  sortedData = [],
  searchQuery,
  setSearchQuery,
  showFilters,
  setShowFilters,
  filters,
  setFilters,
  activeFiltersCount,
  requestSort,
  sortConfig,
  selectedBarangayId,
  handleRowClick,
  isLoading,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchQuery, filters, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE) || 1;
  const paginatedData = sortedData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Smart Windowed Pagination
  const visiblePageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, "...", totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  }, [currentPage, totalPages]);

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === "asc" ? (
      <HugeiconsIcon icon={ArrowUp01Icon} className="w-3 h-3 ml-1 inline text-blue-600 shrink-0" />
    ) : (
      <HugeiconsIcon icon={ArrowDown01Icon} className="w-3 h-3 ml-1 inline text-blue-600 shrink-0" />
    );
  };

  return (
    <div
      id="auditable-ledger"
      className="w-full max-w-full bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs scroll-mt-24"
    >
      {/* Top Bar: Title, Search & Filter Trigger */}
      <div className="p-3.5 sm:p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 rounded-t-2xl">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-slate-200 truncate">
            Auditable Ledger
          </h3>
          <span className="text-xs text-gray-500 dark:text-slate-400 font-medium block">
            {searchQuery.trim()
              ? `Showing ${sortedData.length} of ${sectorData.length} sectors`
              : "Click a row to deep-dive"}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto relative">
          <div className="relative flex-1 sm:w-64 min-w-0">
            <HugeiconsIcon
              icon={Search01Icon}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search barangay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 min-h-[40px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all truncate"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] border rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer select-none ${
              showFilters || activeFiltersCount > 0
                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Filter Popover  */}
          {showFilters && (
            <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-72 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl rounded-2xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex justify-between items-center mb-3.5">
                <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">Filters</h4>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters({
                        minResidents: "",
                        minCompletion: "",
                        maxCompletion: "",
                        status: "All",
                      })
                    }
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Coverage Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                    className="w-full p-2 text-xs sm:text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="All">All Barangays</option>
                    <option value="Covered">Has Residents</option>
                    <option value="Zero Coverage">Zero Coverage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Min. Residents
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    min="0"
                    value={filters.minResidents}
                    onChange={(e) => {
                      let v = e.target.value;
                      if (v !== "") v = Math.max(0, Number(v));
                      setFilters((f) => ({ ...f, minResidents: v }));
                    }}
                    className="w-full p-2 text-xs sm:text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Min. Completion Rate (%)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 75"
                    min="0"
                    max="100"
                    value={filters.minCompletion}
                    onChange={(e) => {
                      let v = e.target.value;
                      if (v !== "") v = Math.max(0, Math.min(100, Number(v)));
                      setFilters((f) => ({ ...f, minCompletion: v }));
                    }}
                    className="w-full p-2 text-xs sm:text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Max. Completion Rate (%)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    min="0"
                    max="100"
                    value={filters.maxCompletion}
                    onChange={(e) => {
                      let v = e.target.value;
                      if (v !== "") v = Math.max(0, Math.min(100, Number(v)));
                      setFilters((f) => ({ ...f, maxCompletion: v }));
                    }}
                    className="w-full p-2 text-xs sm:text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="px-3.5 sm:px-4 py-2 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mr-1">
            Active Filters:
          </span>
          {filters.status !== "All" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Status: {filters.status}
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, status: "All" }))}
                className="hover:text-blue-900 dark:hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </span>
          )}
          {filters.minResidents !== "" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Min Residents: {filters.minResidents}
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, minResidents: "" }))}
                className="hover:text-blue-900 dark:hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </span>
          )}
          {filters.minCompletion !== "" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Min Completion: {filters.minCompletion}%
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, minCompletion: "" }))}
                className="hover:text-blue-900 dark:hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </span>
          )}
          {filters.maxCompletion !== "" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Max Completion: {filters.maxCompletion}%
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, maxCompletion: "" }))}
                className="hover:text-blue-900 dark:hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() =>
              setFilters({
                minResidents: "",
                minCompletion: "",
                maxCompletion: "",
                status: "All",
              })
            }
            className="text-[11px] font-bold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 ml-1 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}

      {/*  Table Viewport */}
      <div
        className={`overflow-x-auto max-h-[460px] overflow-y-auto ${
          totalPages <= 1 ? "rounded-b-2xl" : ""
        }`}
      >
        <table className="w-full text-left border-collapse relative min-w-[640px]">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-800/90 backdrop-blur-xs shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_rgba(255,255,255,0.05)]">
            <tr className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-slate-400 whitespace-nowrap">
              <th
                className="px-4 sm:px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none"
                onClick={() => requestSort("barangay")}
              >
                Barangay {renderSortIcon("barangay")}
              </th>
              <th
                className="px-4 sm:px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none"
                onClick={() => requestSort("resident_count")}
              >
                Residents {renderSortIcon("resident_count")}
              </th>
              <th
                className="px-4 sm:px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none"
                onClick={() => requestSort("certificates_issued")}
              >
                Certificates {renderSortIcon("certificates_issued")}
              </th>
              <th
                className="px-4 sm:px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors w-44 sm:w-52 select-none"
                onClick={() => requestSort("avg_completion_rate")}
              >
                Completion Rate {renderSortIcon("avg_completion_rate")}
              </th>
              <th
                className="px-4 sm:px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none"
                onClick={() => requestSort("active_admins")}
              >
                Admins {renderSortIcon("active_admins")}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60 text-xs sm:text-sm">
            {isLoading ? (
              [1, 2, 3, 4, 5, 6].map((i) => <SkeletonTableRow key={i} columns={5} />)
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 sm:px-6 py-10 text-center text-gray-500 dark:text-slate-400">
                  No barangays found matching &ldquo;
                  <span className="font-semibold text-gray-900 dark:text-slate-100">
                    {searchQuery}
                  </span>
                  &rdquo;
                </td>
              </tr>
            ) : (
              paginatedData.map((sector, index) => {
                const isUnassigned = sector.barangay === "Unassigned";
                const isSelected =
                  selectedBarangayId === (isUnassigned ? "unassigned" : sector.id);

                return (
                  <tr
                    key={index}
                    onClick={() => handleRowClick(isUnassigned ? "unassigned" : sector.id)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        : isUnassigned
                          ? "bg-yellow-50/30 dark:bg-yellow-950/20 hover:bg-yellow-50/60 dark:hover:bg-yellow-950/30"
                          : "hover:bg-gray-50/60 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="px-4 sm:px-6 py-3 border-b border-gray-50 dark:border-slate-800/60 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${
                            isSelected
                              ? "text-blue-700 dark:text-blue-300"
                              : isUnassigned
                                ? "text-yellow-800 dark:text-yellow-300"
                                : "text-gray-900 dark:text-slate-100"
                          }`}
                        >
                          {sector.barangay}
                        </span>
                        {isUnassigned ? (
                          <span className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800/60 text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0">
                            REVIEW
                          </span>
                        ) : sector.avg_completion_rate >= 80 ? (
                          <span className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider shrink-0">
                            Excellent
                          </span>
                        ) : sector.avg_completion_rate >= 50 ? (
                          <span className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60 text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider shrink-0">
                            Good
                          </span>
                        ) : sector.avg_completion_rate >= 20 ? (
                          <span className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider shrink-0">
                            Fair
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60 text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider shrink-0">
                            Critical
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 border-b border-gray-50 dark:border-slate-800/60 text-gray-700 dark:text-slate-300 font-medium tabular-nums">
                      {sector.resident_count}
                    </td>
                    <td className="px-4 sm:px-6 py-3 border-b border-gray-50 dark:border-slate-800/60 text-gray-700 dark:text-slate-300 font-medium tabular-nums">
                      {sector.certificates_issued}
                    </td>
                    <td className="px-4 sm:px-6 py-3 border-b border-gray-50 dark:border-slate-800/60">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isUnassigned
                                ? "bg-yellow-400"
                                : sector.avg_completion_rate >= 80
                                  ? "bg-emerald-500"
                                  : sector.avg_completion_rate >= 50
                                    ? "bg-blue-500"
                                    : sector.avg_completion_rate >= 20
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                            }`}
                            style={{ width: `${sector.avg_completion_rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-slate-400 w-9 text-right tabular-nums shrink-0">
                          {sector.avg_completion_rate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 border-b border-gray-50 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            sector.active_admins > 0
                              ? "bg-emerald-500"
                              : "bg-gray-300 dark:bg-slate-600"
                          }`}
                        />
                        <span className="text-gray-700 dark:text-slate-300 font-medium tabular-nums">
                          {sector.active_admins}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-3.5 sm:p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-2xl">
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium text-center sm:text-left">
            Showing{" "}
            <span className="font-bold text-gray-800 dark:text-slate-200 tabular-nums">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-gray-800 dark:text-slate-200 tabular-nums">
              {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-gray-800 dark:text-slate-200 tabular-nums">
              {sortedData.length}
            </span>{" "}
            barangays
          </p>

          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-9 sm:h-10 px-3 sm:px-3.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs shrink-0"
            >
              Previous
            </button>


            <span className="sm:hidden text-xs font-bold text-gray-700 dark:text-slate-300 tabular-nums px-2">
              Page {currentPage} of {totalPages}
            </span>


            <div className="hidden sm:flex items-center gap-1">
              {visiblePageNumbers.map((page, index) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="w-8 h-9 flex items-center justify-center text-xs font-bold text-gray-400 dark:text-slate-500 select-none"
                  >
                    &hellip;
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[36px] h-9 px-2.5 flex items-center justify-center rounded-xl text-xs font-bold transition-all active:scale-[0.96] cursor-pointer tabular-nums ${
                      currentPage === page
                        ? "bg-blue-600 text-white shadow-xs shadow-blue-600/20"
                        : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-2xs"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-9 sm:h-10 px-3 sm:px-3.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs shrink-0"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
