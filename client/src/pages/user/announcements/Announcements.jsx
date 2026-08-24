// --- START: UserAnnouncements.jsx ---

import AnnouncementCard from "../../../components/ui/announcements/AnnouncementCard";
import useDocumentTitle from "../../../hooks/useDocumentTitle";
import { usePaginatedAnnouncements } from "../hooks/usePaginatedAnnouncements";
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

export default function UserAnnouncements() {
  useDocumentTitle("Announcements | Bacolor LMS");

  const {
    announcements,
    isLoading,
    isError,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
  } = usePaginatedAnnouncements(5);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Announcements
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Stay updated with training notices, local schedules, and portal
            updates.
          </p>
        </div>

        {isLoading && currentPage === 1 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-28 bg-gray-200 rounded-full" />
                  <div className="h-3 w-20 bg-gray-100 rounded-full" />
                </div>
                <div className="h-5 w-3/4 bg-gray-200 rounded-lg" />
                <div className="space-y-2 pt-1">
                  <div className="h-3.5 w-full bg-gray-100 rounded-full" />
                  <div className="h-3.5 w-5/6 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-10 text-red-500 font-medium">Failed to load announcements.</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-10 text-gray-500 font-medium">No announcements available.</div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              {announcements.map((item) => (
                <AnnouncementCard key={item.id} item={item} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm font-medium text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
