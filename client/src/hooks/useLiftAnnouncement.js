import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../lib/apiClient";

// Every query that shows announcements, so a lift or a new post shows up everywhere
export const ANNOUNCEMENT_QUERY_KEYS = [
  ["announcements"],
  ["announcementsFeed"],
  ["activeAdvisories"],
  ["barangayAnnouncements"],
  ["barangayWorkspaceOverview"],
  ["userDashboard"],
];

export function invalidateAnnouncementQueries(queryClient) {
  ANNOUNCEMENT_QUERY_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
}

// Ends an urgent advisory early; asks first because residents stop seeing it pinned
export function useLiftAnnouncement() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (id) => (await apiClient.patch(`/admin/barangay/announcements/${id}/lift`)).data,
    onSuccess: () => {
      toast.success("Advisory lifted. It is no longer pinned for residents.");
      invalidateAnnouncementQueries(queryClient);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Failed to lift the advisory.");
      invalidateAnnouncementQueries(queryClient);
    },
  });

  const lift = (item) => {
    if (window.confirm(`Lift "${item.title}"? Residents will see it as ended and it will no longer be pinned.`)) {
      mutation.mutate(item.id);
    }
  };

  return { lift, isLifting: mutation.isPending, liftingId: mutation.isPending ? mutation.variables : null };
}
