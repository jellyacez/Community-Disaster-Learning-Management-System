import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "../lib/auth-client"; 
import { API_BASE_URL } from "../lib/apiClient";
import { invalidateAnnouncementQueries } from "./useLiftAnnouncement";

export function useRealtimeEvents() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  // Reconnect only when the signed-in user changes, not when other session fields refresh
  const userId = session?.user?.id;

  useEffect(() => {

    if (!userId) {
      return;
    }

    const sseUrl = `${API_BASE_URL.replace(/\/$/, "")}/notif/stream`;

    const eventSource = new EventSource(sseUrl, {
      withCredentials: true,
    });

    // A new post or a lifted advisory changes the order of every announcement list
    eventSource.addEventListener("ANNOUNCEMENT_CREATED", () => invalidateAnnouncementQueries(queryClient));
    eventSource.addEventListener("ANNOUNCEMENT_UPDATED", () => invalidateAnnouncementQueries(queryClient));

    eventSource.addEventListener("SYSTEM_BROADCAST_UPDATE", (e) => {
      const data = JSON.parse(e.data);
      queryClient.setQueryData(["globalBroadcast"], data);
    });

    eventSource.addEventListener("NEW_FEEDBACK_TICKET", () => {
      queryClient.invalidateQueries({ queryKey: ["adminFeedbacks"] });
    });

    eventSource.addEventListener("USER_NOTIFICATION", () => {
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
    });

    eventSource.onerror = (err) => {
      console.warn("SSE connection closed/error. Polling handles fallback.", err);
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient, userId]);
}