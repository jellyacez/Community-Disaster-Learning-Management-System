import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Megaphone01Icon,
  Calendar01Icon,
  UserCircleIcon,
  Alert01Icon,
} from "@hugeicons/core-free-icons";

const AnnouncementCard = memo(function AnnouncementCard({ item }) {
  const isUrgent = item.priority === "urgent";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl p-6 shadow-sm ring-1 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isUrgent
          ? "bg-red-50/60 ring-red-300 border border-red-200"
          : "bg-white ring-gray-200"
      }`}
    >
      {isUrgent && (
        <>
          <div className="absolute left-0 top-0 h-full w-2 bg-red-600" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
        </>
      )}

      <div className="flex gap-5">
        <div
          className={`hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-4 ring-white shadow-sm transition-transform duration-300 group-hover:scale-110 ${
            isUrgent
              ? "bg-red-100 text-red-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          <HugeiconsIcon icon={Megaphone01Icon} className="h-6 w-6" />
        </div>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {isUrgent && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                    <HugeiconsIcon icon={Alert01Icon} className="h-3.5 w-3.5" />
                    Urgent
                  </span>
                )}
              </div>

              <h2
                className={`text-lg font-extrabold leading-tight transition-colors ${
                  isUrgent
                    ? "text-red-900 group-hover:text-red-950"
                    : "text-gray-900 group-hover:text-red-700"
                }`}
              >
                {item.title}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-gray-500">
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={UserCircleIcon}
                    className="h-4 w-4 text-gray-400"
                  />
                  <span>{item.author || item.author_name || "Bacolor Admin"}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={Calendar01Icon}
                    className="h-4 w-4 text-gray-400"
                  />
                  <span>{item.date || item.created_at}</span>
                </div>
              </div>
            </div>
          </div>

          {isUrgent && (
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-red-700">
              High-priority advisory requiring immediate resident attention
            </p>
          )}

          <div className={`text-sm leading-relaxed ${isUrgent ? "text-gray-800" : "text-gray-600"}`}>
            {item.content}
          </div>
        </div>
      </div>
    </div>
  );
});

export default AnnouncementCard;