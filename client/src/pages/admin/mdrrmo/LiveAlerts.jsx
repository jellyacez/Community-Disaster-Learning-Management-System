import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Notification01Icon,
  Alert01Icon,
  PlusSignIcon,
  Calendar01Icon,
  UserIcon, // 👈 updated
  Location01Icon,
} from "@hugeicons/core-free-icons";
import apiClient from "../../../lib/apiClient";
import AnnouncementModal from "../barangay/workspace/announcementModal";

export default function LiveAlerts() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 6;

const { data, isLoading, isError } = useQuery({
    queryKey: ["announcementsFeed", page],
    queryFn: async () => {
      // Points to the active Express endpoint
      const res = await apiClient.get("/admin/barangay/announcements");
      // Returns an array directly
      return res.data?.data || res.data || [];
    },
    refetchInterval: 60000,
  });

  // Handle data as a direct array
  const rawList = Array.isArray(data) ? data : [];
  
  // Client-side pagination
  const total = rawList.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const announcements = rawList.slice((page - 1) * limit, page * limit);
  const pagination = { totalPages, total };
  return (
    <div className="space-y-6 animate-in fade-in duration-150 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              System & Municipal Announcements
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Broadcast emergency alerts, instructional updates, and local advisories
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-sm cursor-pointer whitespace-nowrap"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="w-4 h-4" />
          Broadcast Advisory
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-gray-100 h-44 animate-pulse space-y-3"
            >
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-6 bg-gray-100 rounded w-3/4" />
              <div className="h-12 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex items-center gap-3">
          <HugeiconsIcon icon={Alert01Icon} className="w-5 h-5 shrink-0 text-red-600" />
          <div>
            <p className="font-bold text-sm">Failed to retrieve announcement stream</p>
            <p className="text-xs text-red-500">
              Please verify backend connectivity and database availability.
            </p>
          </div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-800 text-base">No active advisories</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            There are currently no active announcements logged for this jurisdiction. Click above to post the first broadcast.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {announcements.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl p-5 border transition-all shadow-sm flex flex-col justify-between ${
                item.priority === "urgent"
                  ? "border-red-300 ring-1 ring-red-200"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="space-y-3">
                {/* Badges Bar */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                      item.priority === "urgent"
                        ? "bg-red-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.priority === "urgent" ? "Urgent Advisory" : "Standard"}
                  </span>

                  <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded">
                    <HugeiconsIcon icon={Location01Icon} className="w-3 h-3 text-gray-400" />
                    {item.barangay_name ? `Brgy. ${item.barangay_name}` : "All Sectors"}
                  </span>
                </div>

                {/* Title and Content */}
                <div>
                  <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-600 mt-2 line-clamp-3 leading-relaxed">
                    {item.content}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                    <HugeiconsIcon icon={UserIcon} className="w-3.5 h-3.5 text-gray-400" />
                      {item.author_name || item.author || "Administrator"}
              </span>
                <span className="flex items-center gap-1 font-mono">
                    <HugeiconsIcon icon={Calendar01Icon} className="w-3.5 h-3.5 text-gray-400" />
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : item.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-gray-100 text-xs">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-gray-500 font-medium">
            Page <strong className="text-gray-900">{page}</strong> of{" "}
            <strong className="text-gray-900">{pagination.totalPages}</strong>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Modal Integration with multi-role capability */}
      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUserRole="mdrrmo_admin"
      />
    </div>
  );
}