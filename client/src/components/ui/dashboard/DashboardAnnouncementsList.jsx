import { HugeiconsIcon } from "@hugeicons/react";
import { Notification03Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import AnnouncementSkeleton from "../announcements/AnnouncementSkeleton.jsx";

export default function DashboardAnnouncementsList({ displayData, loading, navigate }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm h-fit">
      <div className="mb-5 flex items-center gap-2">
        <HugeiconsIcon
          icon={Notification03Icon}
          className="w-5 h-5 text-red-600"
        />
        <h2 className="text-xl font-bold text-gray-900">
          Latest Announcements
        </h2>
      </div>

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map((i) => <AnnouncementSkeleton key={i} />)
        ) : displayData.announcements.length === 0 ? (
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
          displayData.announcements.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate("/user/announcements")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate("/user/announcements");
                }
              }}
              className="rounded-2xl bg-gray-50 p-4 hover:bg-gray-100 transition cursor-pointer border border-transparent hover:border-gray-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 outline-hidden"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  {item.date}
                </p>
                <p className="text-[10px] text-gray-500 font-medium">
                  {item.author}
                </p>
              </div>
              <h3 className="text-sm font-bold text-gray-900">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                {item.content}
              </p>
            </div>
          ))
        )}
      </div>

      {!loading && displayData.announcements.length > 0 && (
        <button
          onClick={() => navigate("/user/announcements")}
          className="w-full mt-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          View All Announcements
        </button>
      )}
    </div>
  );
}
