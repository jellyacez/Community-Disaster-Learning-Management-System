import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";

export function useFeedbackHistory(userId, activeTab) {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [replyInputs, setReplyInputs] = useState({});
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReplyChange = (id, val) => setReplyInputs((prev) => ({ ...prev, [id]: val }));

  // 1. FETCH LIVE FEEDBACK HISTORY
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["userFeedbacks", userId],
    queryFn: async () => {
      const response = await apiClient.get("/feedbacks/my-submissions");
      return response.data.data || [];
    },
    enabled: !!userId,
    // Polling intentionally omitted per instructions
  });

  const userReplyMutation = useMutation({
    mutationFn: async ({ id, reply }) => {
      const response = await apiClient.put(`/feedbacks/${id}/reply`, { reply });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Reply sent successfully.");
      queryClient.invalidateQueries(["userFeedbacks", userId]);
      setReplyInputs({});
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to send reply.");
    },
  });

  const handleSubmitUserReply = (id) => {
    const txt = replyInputs[id];
    if (!txt?.trim()) return toast.error("Please enter a reply.");
    userReplyMutation.mutate({ id, reply: txt });
  };

  const filteredSubmissions = useMemo(() => {
    let result = submissions;
    if (activeTab !== "all") {
      result = result.filter(
        (item) => item.status.toLowerCase() === activeTab.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.subject?.toLowerCase().includes(q) ||
          item.type?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeTab, submissions, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / PAGE_SIZE));

  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSubmissions.slice(start, start + PAGE_SIZE);
  }, [filteredSubmissions, currentPage, PAGE_SIZE]);

  const tabs = useMemo(() => [
    { key: "all", label: "All", count: submissions.length },
    {
      key: "pending",
      label: "Pending",
      count: submissions.filter((item) => item.status === "Pending").length,
    },
    {
      key: "replied",
      label: "Replied",
      count: submissions.filter((item) => item.status === "Replied").length,
    },
    {
      key: "closed",
      label: "Closed",
      count: submissions.filter((item) => item.status === "Closed").length,
    },
  ], [submissions]);

  return {
    submissions,
    isLoading,
    filteredSubmissions,
    paginatedSubmissions,
    currentPage,
    setCurrentPage,
    PAGE_SIZE,
    totalPages,
    tabs,
    searchQuery,
    setSearchQuery: handleSearchChange,
    expandedIds,
    toggleExpand,
    replyInputs,
    handleReplyChange,
    handleSubmitUserReply,
    userReplyMutation,
  };
}
