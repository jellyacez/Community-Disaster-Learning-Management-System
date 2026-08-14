import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon } from "@hugeicons/core-free-icons";
import FeedbackTicketCard from "./FeedbackTicketCard";

export default function FeedbackList({
  isLoading,
  filteredSubmissions,
  paginatedSubmissions,
  activeTab,
  currentPage,
  PAGE_SIZE,
  totalPages,
  setCurrentPage,
  expandedIds,
  toggleExpand,
  handleOpenReplyModal,
  setTicketToClose,
}) {
  return (
    <>
      {/* Result count */}
      {!isLoading && (
        <p className="text-xs text-gray-400 font-semibold mb-3">
          Showing {filteredSubmissions.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredSubmissions.length)} of {filteredSubmissions.length} ticket{filteredSubmissions.length !== 1 ? "s" : ""}
        </p>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-gray-400 font-bold">
          Loading communications...
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <HugeiconsIcon
            icon={Message01Icon}
            className="w-12 h-12 text-gray-300 mx-auto mb-3"
          />
          <p className="text-lg font-bold text-gray-800">
            No tickets found in this queue
          </p>
          <p className="text-sm text-gray-500 mt-1">
            There are no {activeTab === "all" ? "" : activeTab} resident communications matching your filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedSubmissions.map((item) => (
            <FeedbackTicketCard
              key={item.feedback_id || item.id}
              item={item}
              isExpanded={expandedIds.has(item.feedback_id || item.id)}
              toggleExpand={toggleExpand}
              handleOpenReplyModal={handleOpenReplyModal}
              setTicketToClose={setTicketToClose}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm font-semibold text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}
