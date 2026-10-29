import { createPortal } from "react-dom";
import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification03Icon } from "@hugeicons/core-free-icons";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../../lib/apiClient";

// In-app notifications from public.user_notification (e.g. module approved/rejected)
export default function AdminNotificationBell({ buttonClassName = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const [position, setPosition] = useState({ top: 72, left: 12, width: 320 });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(window.innerWidth - 24, window.innerWidth >= 768 ? 384 : 320);
      setPosition({top: Math.max(12, Math.min(rect.bottom + 10, window.innerHeight - 120)), left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), width});
    };
    const escape = event => { if (event.key === "Escape") { setIsOpen(false); triggerRef.current?.focus(); } };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    document.addEventListener("keydown", escape);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); document.removeEventListener("keydown", escape); };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target) && !panelRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["userNotifications"],
    queryFn: async () => {
      const response = await apiClient.get("/users/me/notifications");
      return response.data.data;
    },
    refetchInterval: 60000,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Opening the panel marks everything as read; refetch on close so the unread highlight stays visible while open
  const markedRead = useRef(false);
  useEffect(() => {
    if (isOpen && unreadCount > 0 && !markedRead.current) {
      markedRead.current = true;
      apiClient.patch("/users/me/notifications/read").catch(() => {});
    } else if (!isOpen && markedRead.current) {
      markedRead.current = false;
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
    }
  }, [isOpen, unreadCount, queryClient]);

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
                        className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${["module_rejected", "certificate_revoked", "recert_reminder"].includes(item.type) ? "bg-amber-500" : "bg-emerald-500"}`}
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
