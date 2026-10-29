import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification03Icon } from "@hugeicons/core-free-icons";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../../lib/apiClient";
import { useNotificationPreferences } from "../settings/hooks/useNotificationPreferences";
import { useAnchoredPopover } from "../../hooks/useAnchoredPopover";
import { useNotificationFeed, WARNING_NOTIFICATION_TYPES } from "../../hooks/useNotificationFeed";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { wrapperRef: dropdownRef, panelRef, triggerRef, position } = useAnchoredPopover(isOpen, setIsOpen, "right");
  const navigate = useNavigate();

  // Pull settings from DB via our custom hook
  const { settings, updatePreference } = useNotificationPreferences();
  const lastSeenId = settings?.lastSeenAnnouncementId || null;

  const { data: dashboardData, isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ["userDashboard"],
    queryFn: async () => {
      const response = await apiClient.get("/user/dashboard");
      return response.data;
    },
    refetchInterval: 60000,
  });

  // Defensively handle React Query HMR cache poisoning
  const announcements = dashboardData?.announcements
    ? dashboardData.announcements
    : dashboardData?.data?.announcements
      ? dashboardData.data.announcements
      : [];
  const recentAnnouncements = announcements.slice(0, 3);

  // Personal notifications (feedback replies, certificates, reminders); opening marks them read
  const { notifications, unreadCount: personalUnread } = useNotificationFeed(isOpen);
  // Capped so emergency announcements below stay in view
  const personal = notifications.slice(0, 3);

  // A notification is "new" if the newest announcement ID doesn't match what is stored in DB settings
  const hasUnreadAnnouncement =
    recentAnnouncements.length > 0 &&
    String(recentAnnouncements[0].id) !== String(lastSeenId);
  const hasUnread = hasUnreadAnnouncement || personalUnread > 0;

  // When dropdown opens, mark the newest announcement as seen in the DB
  useEffect(() => {
    if (isOpen && recentAnnouncements.length > 0) {
      const topId = String(recentAnnouncements[0].id);
      if (topId !== String(lastSeenId)) {
        updatePreference("lastSeenAnnouncementId", topId);
      }
    }
  }, [isOpen, recentAnnouncements, lastSeenId, updatePreference]);

  return (
    <div className="relative inline-flex" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-label={hasUnread ? "Notifications, new items" : "Notifications"}
        className="relative inline-flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 sm:p-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
      >
        <HugeiconsIcon
          aria-hidden="true"
          icon={Notification03Icon}
          className="w-5 h-5 shrink-0"
        />
        {hasUnread && (
          <span className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>

      {createPortal(<AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            ref={panelRef}
            style={{...position, maxHeight: `calc(100dvh - ${position.top + 12}px)`}}
            className="fixed rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-gray-100 dark:border-slate-800 ring-1 ring-black/5 z-[100] overflow-hidden flex flex-col min-w-0"
          >
            {/* Dropdown Header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900 flex items-center justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                Notifications
              </h3>
              {hasUnread && (
                <span className="text-[11px] sm:text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full shrink-0">
                  New
                </span>
              )}
            </div>

            {/* Notification List */}
            <div className="min-h-0 flex-1 max-h-[55vh] sm:max-h-[420px] overflow-y-auto overscroll-contain p-1.5 sm:p-2">
              {personal.length > 0 && (
                <div className="flex flex-col gap-1 pb-2 mb-1.5 border-b border-gray-100 dark:border-slate-800">
                  <p className="px-2.5 pt-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    For you
                  </p>
                  {personal.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2.5 sm:p-3 rounded-xl flex gap-2.5 min-w-0 ${item.is_read ? "" : "bg-red-50/60 dark:bg-red-950/30"}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${WARNING_NOTIFICATION_TYPES.has(item.type) ? "bg-amber-500" : "bg-emerald-500"}`}
                      />
                      <div className="flex flex-col gap-1 min-w-0">
                        <p className="text-xs sm:text-sm text-gray-800 dark:text-slate-200 break-words [overflow-wrap:anywhere] leading-relaxed">
                          {item.message}
                        </p>
                        <span className="text-[11px] text-gray-500 dark:text-slate-400 tabular-nums">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {personal.length > 0 && (
                <p className="px-2.5 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Announcements
                </p>
              )}
              {isLoadingAnnouncements ? (
                <div className="p-4 text-center text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                  Loading...
                </div>
              ) : recentAnnouncements.length === 0 ? (
                <div className="p-4 text-center text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                  No new announcements.
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {recentAnnouncements.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 sm:p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors flex flex-col gap-1 cursor-default min-w-0"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-1 sm:gap-2 min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100 line-clamp-2 break-words [overflow-wrap:anywhere] min-w-0">
                          {item.title}
                        </span>
                        <span className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 shrink-0 whitespace-nowrap tabular-nums">
                          {item.date}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2 break-words leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Action */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate("/user/announcements");
              }}
              className="w-full shrink-0 min-h-11 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200/60 transition-colors border-t border-gray-100 dark:border-slate-800 focus:outline-none cursor-pointer"
            >
              View All Announcements
            </button>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
}
