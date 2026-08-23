import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";
import { localDb } from "../../../../lib/localDb";
import { retryFailedTask, discardFailedTask } from "../../../../lib/LocalSave/syncManager";

export function useFeedbackHistory(userId, activeTab) {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [replyInputs, setReplyInputs] = useState({});
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [offlineFeedbackItems, setOfflineFeedbackItems] = useState([]);
  const PAGE_SIZE = 10;

  // Load offline feedback items from Dexie
  const loadOfflineFeedbacks = async () => {
    try {
      const items = await localDb.sync_queue
        .where("action_type")
        .equals("SUBMIT_FEEDBACK")
        .toArray();
      setOfflineFeedbackItems(items);
    } catch (e) {
      console.error("Error loading offline feedback from Dexie:", e);
    }
  };

  useEffect(() => {
    loadOfflineFeedbacks();
    window.addEventListener("offline-sync-queue-updated", loadOfflineFeedbacks);
    return () => {
      window.removeEventListener("offline-sync-queue-updated", loadOfflineFeedbacks);
    };
  }, []);

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
  const { data: serverSubmissions = [], isLoading } = useQuery({
    queryKey: ["userFeedbacks", userId],
    queryFn: async () => {
      const response = await apiClient.get("/feedbacks/my-submissions");
      return response.data.data || [];
    },
    enabled: !!userId,
  });

  // Merge server submissions with offline queue items
  const submissions = useMemo(() => {
    const formattedOffline = offlineFeedbackItems.map((item) => ({
      id: `offline-${item.sync_id}`,
      sync_id: item.sync_id,
      isOfflineItem: true,
      subject: item.payload?.subject || "Untitled Feedback",
      type: item.payload?.type || "feedback",
      recipient: item.payload?.recipient || "barangay",
      status: item.status === "failed" ? "Sync Failed" : item.status === "retrying" ? "Syncing" : "Queued Offline",
      created_at: item.created_at || new Date().toISOString(),
      last_error: item.last_error,
      error_type: item.error_type,
      retry_count: item.retry_count,
      thread: [
        {
          id: `offline-msg-${item.sync_id}`,
          sender_type: "resident",
          message: item.payload?.message || "",
          created_at: item.created_at || new Date().toISOString(),
        },
      ],
    }));

    return [...formattedOffline, ...serverSubmissions];
  }, [offlineFeedbackItems, serverSubmissions]);

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

  const handleRetryOfflineItem = async (syncId) => {
    try {
      toast.loading("Retrying offline sync...", { id: `retry-${syncId}` });
      await retryFailedTask(syncId);
      toast.success("Sync triggered.", { id: `retry-${syncId}` });
    } catch (e) {
      toast.error("Retry failed to initiate.", { id: `retry-${syncId}` });
    }
  };

  const handleDiscardOfflineItem = async (syncId) => {
    try {
      await discardFailedTask(syncId);
      toast.success("Offline message discarded.");
    } catch (e) {
      toast.error("Failed to discard message.");
    }
  };

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
    handleRetryOfflineItem,
    handleDiscardOfflineItem,
  };
}
