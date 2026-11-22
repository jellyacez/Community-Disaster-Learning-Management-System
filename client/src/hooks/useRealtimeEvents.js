import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "../lib/auth-client"; 
import { API_BASE_URL } from "../lib/apiClient";
import { invalidateAnnouncementQueries } from "./useLiftAnnouncement";
import { EMERGENCY_CONTACTS_KEY, noteEmergencyContactsVersion } from "./useEmergencyContacts";

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

    // An admin saved the hotlines: refetch the resident list (past the browser cache) and the editor
    eventSource.addEventListener("EMERGENCY_CONTACTS_UPDATED", (e) => {
      try {
        noteEmergencyContactsVersion(JSON.parse(e.data).version);
      } catch { /* refetch without the version */ }
      queryClient.invalidateQueries({ queryKey: EMERGENCY_CONTACTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["adminEmergencyContacts"] });
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