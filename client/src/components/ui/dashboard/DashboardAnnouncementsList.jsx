import React from "react";
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
          <div className="text-center py-6">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              className="w-8 h-8 text-gray-300 mx-auto mb-2"
            />
            <p className="text-sm text-gray-500">
              No new announcements at this time.
            </p>
          </div>
        ) : (
          displayData.announcements.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate("/user/announcements")}
              className="rounded-2xl bg-gray-50 p-4 hover:bg-gray-100 transition cursor-pointer border border-transparent hover:border-gray-200"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  {item.date}
                </p>
                <p className="text-[10px] text-gray-400 font-medium">
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
