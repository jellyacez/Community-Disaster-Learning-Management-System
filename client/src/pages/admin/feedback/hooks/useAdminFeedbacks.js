import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";

export function useAdminFeedbacks(adminId, adminRole, selectedBarangayFilter, isMdrrmoOrSystem) {
  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["adminFeedbacks", adminRole, selectedBarangayFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isMdrrmoOrSystem && selectedBarangayFilter !== "all") {
        params.append("barangay_id", selectedBarangayFilter);
      }

      const response = await apiClient.get(`/admin/mdrrmo/feedback?${params.toString()}`);
      return response.data.data || [];
    },
    enabled: !!adminId,
    refetchInterval: 30000, // Poll every 30s for incoming resident feedback
  });

  const replyMutation = useMutation({
    mutationFn: async ({ feedbackId, reply, status }) => {
      const response = await apiClient.put(`/admin/mdrrmo/feedback/${feedbackId}/reply`, {
        reply,
        status,
      });
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      toast.success("Official response sent successfully!");
      queryClient.invalidateQueries({ queryKey: ["adminFeedbacks"] });
      if (context?.onSuccessCb) context.onSuccessCb();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to submit reply.");
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (feedbackId) => {
      const response = await apiClient.put(`/admin/mdrrmo/feedback/${feedbackId}/close`);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      toast.success("Ticket closed successfully.");
      queryClient.invalidateQueries({ queryKey: ["adminFeedbacks"] });
      if (context?.onSuccessCb) context.onSuccessCb();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to close ticket.");
    },
  });

  return {
    submissions,
    isLoading,
    replyMutation,
    closeMutation,
  };
}
