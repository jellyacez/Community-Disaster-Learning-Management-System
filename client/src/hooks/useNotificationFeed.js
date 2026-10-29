import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/apiClient";

// Personal notification types shown with an amber (needs attention) dot instead of green
export const WARNING_NOTIFICATION_TYPES = new Set(["module_rejected", "certificate_revoked", "recert_reminder"]);

// The server pushes USER_NOTIFICATION over SSE (useRealtimeEvents); polling only covers a dropped stream
const FALLBACK_POLL_MS = 5 * 60 * 1000;

/**
 * The signed-in user's notifications from public.user_notification. Opening the panel marks them
 * read; the list refetches on close so the unread highlight stays visible while it is open.
 */
export function useNotificationFeed(isOpen) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["userNotifications"],
    queryFn: async () => {
      const response = await apiClient.get("/users/me/notifications");
      return response.data.data;
    },
    refetchInterval: FALLBACK_POLL_MS,
  });

  const unreadCount = data?.unreadCount || 0;

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

  return { notifications: data?.notifications || [], unreadCount, isLoading };
}
