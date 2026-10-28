import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";

// filters: { page, limit, status, search, sort } — applied on the server, which returns
// one page plus the per-tab counts
export function useAdminFeedbacks(adminId, adminRole, selectedBarangayFilter, isMdrrmoOrSystem, filters) {
  const queryClient = useQueryClient();

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["adminFeedbacks", adminRole, selectedBarangayFilter, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters.page,
        limit: filters.limit,
        sort: filters.sort,
      });
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.search.trim()) params.append("search", filters.search.trim());
      if (isMdrrmoOrSystem && selectedBarangayFilter !== "all") {
        params.append("barangay_id", selectedBarangayFilter);
      }

      const response = await apiClient.get(`/admin/mdrrmo/feedback?${params.toString()}`);
      return {
        submissions: response.data.data || [],
        meta: response.data.meta || { total: 0, totalPages: 1 },
        counts: response.data.counts,
      };
    },
    enabled: !!adminId,
    // Keep the current page on screen while the next page or filter loads
    placeholderData: keepPreviousData,
    refetchInterval: 1000 * 60 * 3, // Poll every 3 minutes for incoming resident feedback
  });

  const submissions = data?.submissions ?? [];

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
    total: data?.meta?.total ?? 0,
    totalPages: data?.meta?.totalPages ?? 1,
    counts: data?.counts,
    isLoading,
    isPlaceholderData,
    replyMutation,
    closeMutation,
  };
}
