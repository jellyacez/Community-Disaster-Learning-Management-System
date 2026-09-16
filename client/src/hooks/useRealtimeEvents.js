import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "../lib/auth-client"; 

export function useRealtimeEvents() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession(); 

  useEffect(() => {
  
    if (!session?.user) {
      return;
    }

    const sseUrl =
      import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api/notif/stream`
        : "http://localhost:5000/api/notif/stream";

    const eventSource = new EventSource(sseUrl, {
      withCredentials: true,
    });

    eventSource.addEventListener("ANNOUNCEMENT_CREATED", () => {
      queryClient.invalidateQueries({ queryKey: ["barangayAnnouncements"] });
      queryClient.invalidateQueries({ queryKey: ["barangayWorkspaceOverview"] });
    });

    eventSource.addEventListener("SYSTEM_BROADCAST_UPDATE", (e) => {
      const data = JSON.parse(e.data);
      queryClient.setQueryData(["systemBroadcast"], data);
    });

    eventSource.addEventListener("NEW_FEEDBACK_TICKET", () => {
      queryClient.invalidateQueries({ queryKey: ["adminFeedbacks"] });
    });

    eventSource.onerror = (err) => {
      console.warn("SSE connection closed/error. Polling handles fallback.", err);
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient, session?.user]); 
}