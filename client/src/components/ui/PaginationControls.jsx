import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // If near the beginning
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  // If near the end
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

const PaginationControls = memo(function PaginationControls({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems,
  itemsPerPage,
  itemName = "items",
  autoScroll = true,
  className = "",
}) {
  if (totalPages <= 1) return null;

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);

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

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const startItem = totalItems !== undefined && itemsPerPage
    ? (currentPage - 1) * itemsPerPage + 1
    : null;
  const endItem = totalItems !== undefined && itemsPerPage
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : null;

  return (
    <nav
      aria-label="Pagination Navigation"
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`}
    >
      {/* Left Item Counter / Page Label */}
      <div className="text-xs text-gray-500 font-medium">
        {totalItems !== undefined && itemsPerPage ? (
          <span>
            Showing <span className="font-bold text-gray-800">{startItem}</span> to{" "}
            <span className="font-bold text-gray-800">{endItem}</span> of{" "}
            <span className="font-bold text-gray-800">{totalItems}</span> {itemName}
          </span>
        ) : (
          <span>
            Page <span className="font-bold text-gray-800">{currentPage}</span> of{" "}
            <span className="font-bold text-gray-800">{totalPages}</span>
          </span>
        )}
      </div>

      {/* Right Navigation & Numeric Pills */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Go to previous page"
          className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer flex items-center gap-1"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Previous</span>
        </button>

        {/* Numeric Page Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, idx) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-xs font-bold text-gray-400 select-none"
                >
                  …
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <button
                key={`page-${page}`}
                type="button"
                onClick={() => handlePageChange(page)}
                aria-label={`Go to page ${page}`}
                aria-current={isActive ? "page" : undefined}
                className={`min-w-[36px] h-9 px-2 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                  isActive
                    ? "bg-red-600 text-white shadow-sm ring-2 ring-red-600/20"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-2xs"
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Go to next page"
          className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer flex items-center gap-1"
        >
          <span className="hidden xs:inline">Next</span>
          <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
});

export default PaginationControls;
