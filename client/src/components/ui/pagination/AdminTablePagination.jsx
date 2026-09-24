import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Near the beginning
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  // Near the end
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  // In the middle
  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

const AdminTablePagination = memo(function AdminTablePagination({
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 10,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 25, 50],
  itemName = "records",
  sticky = true,
  autoScroll = true,
  isLoading = false,
  className = "",
}) {
  if (isLoading || total === 0) return null;

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    onPageChange?.(newPage);

    if (autoScroll) {
      requestAnimationFrame(() => {
        try {
          const mainEl = document.querySelector("main");
          if (mainEl && mainEl.scrollTop > 0) {
            mainEl.scrollTo({ top: 0, behavior: "smooth" });
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
          window.scrollTo(0, 0);
        }
      });
    }
  };

  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value);
    onLimitChange?.(newLimit);
  };

  const start = total > 0 ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);
  const pageNumbers = getPageNumbers(page, totalPages);

  const stickyStyles = sticky
    ? "sticky bottom-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.04)] border-t border-gray-200 dark:border-slate-800"
    : "border-t border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50";

  return (
    <nav
      aria-label="Table pagination navigation"
      className={`px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-200 ${stickyStyles} ${className}`}
    >
      {/* Left: Summary and Rows per page */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 dark:text-slate-400">
        <span>
          Showing <span className="font-bold text-gray-900 dark:text-slate-100">{start}</span> to{" "}
          <span className="font-bold text-gray-900 dark:text-slate-100">{end}</span> of{" "}
          <span className="font-bold text-gray-900 dark:text-slate-100">{total}</span> {itemName}
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-2 border-l border-gray-200 dark:border-slate-800 pl-4">
            <label htmlFor="admin-table-limit" className="text-gray-500 dark:text-slate-400">
              Rows per page:
            </label>
            <select
              id="admin-table-limit"
              value={limit}
              onChange={handleLimitChange}
              className="text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 cursor-pointer shadow-2xs transition-colors"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Previous, Numbered Page Pills, and Next */}
      {totalPages > 1 ? (
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Go to previous page"
            className="min-h-[34px] px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/60 hover:border-gray-300 dark:hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer flex items-center gap-1"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page Pills */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((p, idx) => {
              if (p === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-8 h-8 flex items-center justify-center text-xs font-bold text-gray-400 dark:text-slate-500 select-none"
                  >
                    …
                  </span>
                );
              }

              const isActive = p === page;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => handlePageChange(p)}
                  aria-label={`Go to page ${p}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`min-w-[34px] h-[34px] px-2 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                    isActive
                      ? "bg-red-600 text-white shadow-sm ring-2 ring-red-600/20"
                      : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60 hover:border-gray-300 dark:hover:border-slate-600 shadow-2xs"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Go to next page"
            className="min-h-[34px] px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/60 hover:border-gray-300 dark:hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer flex items-center gap-1"
          >
            <span className="hidden sm:inline">Next</span>
            <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}
    </nav>
  );
});

export default AdminTablePagination;
