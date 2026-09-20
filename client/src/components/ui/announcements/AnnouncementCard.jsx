import { memo, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons";

const AnnouncementCard = memo(function AnnouncementCard({ item }) {
  const isUrgent = item?.priority === "urgent";

  // Use the yearly sequence from DB or fall back to item.id
  const seqNum = item?.advisory_number || item?.id || 1;
  const advisoryLabel = `Advisory #${seqNum}`;

  // Check if announcement was posted within the last 48 hours
  const isNew = useMemo(() => {
    const postDate = new Date(item?.date || item?.created_at || Date.now());
    const hoursSince = (Date.now() - postDate.getTime()) / (1000 * 60 * 60);
    return hoursSince <= 48;
  }, [item?.date, item?.created_at]);

  const formattedDate = useMemo(() => {
    const d = item?.date || item?.created_at;
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [item?.date, item?.created_at]);

  return (
    <article
      className={`relative flex flex-col rounded-2xl bg-white dark:bg-slate-900 border p-5 sm:p-6 transition-all duration-150 shadow-sm ${
        isUrgent
          ? "border-red-300 dark:border-red-900/60"
          : "border-gray-200 dark:border-slate-800"
      }`}
    >
      {/* Top Advisory Pill Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {/* Simple Clean Pill: Advisory # with New indicator */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isNew
                ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                : "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isNew ? "bg-red-600 animate-pulse" : "bg-gray-400"
              }`}
            />
            {advisoryLabel} {isNew && "• New"}
          </span>

          {/* Urgent Badge */}
          {isUrgent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
              <HugeiconsIcon icon={Alert01Icon} className="h-3 w-3" />
              Urgent
            </span>
          )}
        </div>

        {/* Date */}
        {formattedDate && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <HugeiconsIcon icon={Calendar01Icon} className="w-3.5 h-3.5" />
            <time dateTime={item?.date || item?.created_at}>{formattedDate}</time>
          </div>
        )}
      </div>

      {/* Title & Body (Author/Issuer footer intentionally removed) */}
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
          {item?.title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
          {item?.content}
        </p>
      </div>
    </article>
  );
});

export default AnnouncementCard;