import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification03Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import AnnouncementSkeleton from "../announcements/AnnouncementSkeleton.jsx";

export default function DashboardAnnouncementsList({ displayData, loading, navigate }) {
  const announcements = displayData?.announcements || [];

  // Precompute advisory sequence numbers per calendar year (Jan 1 reset)
  const itemsWithSequence = useMemo(() => {
    return announcements.map((item) => {
      // 1. If the API controller provided advisory_number, use it directly
      if (item.advisory_number) {
        return { ...item, seqNum: item.advisory_number };
      }

      // 2. Client-side fallback: calculate sequence within the same calendar year
      const itemDate = new Date(item.date || item.created_at || Date.now());
      const itemYear = itemDate.getFullYear();

      const sameYearItems = announcements
        .filter((a) => {
          const d = new Date(a.date || a.created_at || Date.now());
          return d.getFullYear() === itemYear;
        })
        .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));

      const idx = sameYearItems.findIndex((a) => a.id === item.id);
      return {
        ...item,
        seqNum: idx !== -1 ? idx + 1 : item.id || 1,
      };
    });
  }, [announcements]);

  // Determine if an announcement was issued within the last 48 hours
  const checkIsNew = (item) => {
    const postDate = new Date(item.date || item.created_at || Date.now());
    const hoursSince = (Date.now() - postDate.getTime()) / (1000 * 60 * 60);
    return hoursSince <= 48;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm h-fit">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={Notification03Icon}
            className="w-5 h-5 text-red-600"
          />
          <h2 className="text-xl font-bold text-gray-900">
            Latest Announcements
          </h2>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map((i) => <AnnouncementSkeleton key={i} />)
        ) : itemsWithSequence.length === 0 ? (
          <div className="text-center py-8 px-4 bg-gray-50/60 rounded-2xl border border-gray-100/80">
            <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-3 shadow-2xs">
              <HugeiconsIcon
                icon={Notification03Icon}
                className="w-6 h-6 text-gray-400 stroke-[1.5]"
              />
            </div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
              All Clear
            </h4>
            <p className="text-xs text-gray-500 max-w-[200px] mx-auto">
              No active emergency advisories or municipal bulletins at this time.
            </p>
          </div>
        ) : (
          itemsWithSequence.map((item) => {
            const isNew = checkIsNew(item);
            const isUrgent = item.priority === "urgent";

            return (
              <div
                key={item.id}
                onClick={() => navigate("/user/announcements")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("/user/announcements");
                  }
                }}
                className="rounded-2xl bg-gray-50 p-4 hover:bg-gray-100 transition cursor-pointer border border-transparent hover:border-gray-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 outline-hidden space-y-2"
              >
                {/* Top Pill Strip: Advisory # + New status + Urgent (author removed) */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isNew
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-white text-gray-700 border-gray-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isNew ? "bg-red-600 animate-pulse" : "bg-gray-400"
                        }`}
                      />
                      Advisory #{item.seqNum} {isNew && "• New"}
                    </span>

                    {/* Urgent Tag */}
                    {isUrgent && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        <HugeiconsIcon icon={AlertCircleIcon} className="w-2.5 h-2.5" />
                        Urgent
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-medium text-gray-400">
                    {item.date}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-gray-900 leading-snug">
                  {item.title}
                </h3>
                
                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                  {item.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      {!loading && itemsWithSequence.length > 0 && (
        <button
          onClick={() => navigate("/user/announcements")}
          className="w-full mt-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
        >
          View All Announcements
        </button>
      )}
    </div>
  );
}