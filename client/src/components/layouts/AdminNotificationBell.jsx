import { createPortal } from "react-dom";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification03Icon } from "@hugeicons/core-free-icons";
import { motion, AnimatePresence } from "framer-motion";
import { useAnchoredPopover } from "../../hooks/useAnchoredPopover";
import { useNotificationFeed, WARNING_NOTIFICATION_TYPES } from "../../hooks/useNotificationFeed";

// In-app notifications from public.user_notification (e.g. module approved/rejected)
export default function AdminNotificationBell({ buttonClassName = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const { wrapperRef, panelRef, triggerRef, position } = useAnchoredPopover(isOpen, setIsOpen, "left");
  const { notifications, unreadCount, isLoading } = useNotificationFeed(isOpen);

  return (
    <div className="relative inline-flex" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className={`relative inline-flex items-center justify-center rounded-xl p-2 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/70 ${buttonClassName}`}
      >
        <HugeiconsIcon aria-hidden="true" icon={Notification03Icon} className="w-5 h-5 shrink-0" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[10px] font-bold text-gray-900 flex items-center justify-center tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
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
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
            </div>

            <div className="min-h-0 flex-1 max-h-[55vh] sm:max-h-[360px] overflow-y-auto overscroll-contain p-1.5 sm:p-2">
              {isLoading ? (
                <div className="p-4 text-center text-xs sm:text-sm text-gray-500 dark:text-slate-400">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-xs sm:text-sm text-gray-500 dark:text-slate-400">No notifications yet.</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {notifications.map((item) => (
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
}
