import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon } from "@hugeicons/core-free-icons";
import FeedbackTicketCard from "./FeedbackTicketCard";
import { FeedbackTicketSkeleton } from "../../../../components/ui/Skeleton";
import AdminTablePagination from "../../../../components/ui/pagination/AdminTablePagination";

export default function FeedbackList({
  isLoading,
  filteredSubmissions,
  paginatedSubmissions,
  activeTab,
  currentPage,
  pageSize = 10,
  setPageSize,
  PAGE_SIZE,
  totalPages,
  setCurrentPage,
  expandedIds,
  toggleExpand,
  replyMutation,
  closeMutation,
}) {
  return (
    <>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <FeedbackTicketSkeleton key={i} />
          ))}
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
              replyMutation={replyMutation}
              closeMutation={closeMutation}
            />
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && (
        <AdminTablePagination
          page={currentPage}
          totalPages={totalPages}
          total={filteredSubmissions.length}
          limit={pageSize || PAGE_SIZE || 10}
          onPageChange={setCurrentPage}
          onLimitChange={setPageSize}
          itemName="tickets"
          sticky={true}
          className="mt-6 rounded-2xl border border-gray-200"
        />
      )}
    </>
  );
}
