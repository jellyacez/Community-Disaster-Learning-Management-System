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

  // Load offline feedback items and replies from Dexie
  const loadOfflineFeedbacks = async () => {
    try {
      const items = await localDb.sync_queue
        .filter((t) => t.action_type === "SUBMIT_FEEDBACK" || t.action_type === "REPLY_FEEDBACK")
        .toArray();
      setOfflineFeedbackItems(items);
    } catch (e) {
      console.error("Error loading offline feedback from Dexie:", e);
    }
  };

  useEffect(() => {
    loadOfflineFeedbacks();
    window.addEventListener("offline-sync-queue-updated", loadOfflineFeedbacks);
    window.addEventListener("offline-sync-item-success", loadOfflineFeedbacks);
    return () => {
      window.removeEventListener("offline-sync-queue-updated", loadOfflineFeedbacks);
      window.removeEventListener("offline-sync-item-success", loadOfflineFeedbacks);
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

  // 1. FETCH LIVE FEEDBACK HISTORY (TanStack Query v5 object schema)
  const { data: serverSubmissions = [], isLoading } = useQuery({
    queryKey: ["userFeedbacks", userId],
    queryFn: async () => {
      const response = await apiClient.get("/feedbacks/my-submissions");
      return response.data.data || [];
    },
    enabled: Boolean(userId),
  });

  // Merge server submissions with offline queue items (new tickets + thread replies)
  const submissions = useMemo(() => {
    const offlineTickets = offlineFeedbackItems
      .filter((i) => i.action_type === "SUBMIT_FEEDBACK")
      .map((item) => ({
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

    const offlineReplies = offlineFeedbackItems.filter(
      (i) => i.action_type === "REPLY_FEEDBACK"
    );

    const mergedServer = serverSubmissions.map((ticket) => {
      const matchingReplies = offlineReplies.filter(
        (r) => String(r.payload?.feedback_id || r.payload?.id) === String(ticket.id)
      );

      if (matchingReplies.length === 0) return ticket;

      const formattedReplies = matchingReplies.map((r) => ({
        id: `offline-reply-${r.sync_id}`,
        sync_id: r.sync_id,
        sender_type: "resident",
        message: r.payload?.reply || "",
        created_at: r.created_at || new Date().toISOString(),
        isOfflineReply: true,
        status: r.status,
        last_error: r.last_error,
      }));

      return {
        ...ticket,
        thread: [...(ticket.thread || []), ...formattedReplies],
      };
    });

    return [...offlineTickets, ...mergedServer];
  }, [offlineFeedbackItems, serverSubmissions]);

  // 2. USER REPLY MUTATION (TanStack Query v5 object schema)
  const userReplyMutation = useMutation({
    networkMode: "always",
    mutationFn: async ({ id, reply }) => {
      if (!userId) throw new Error("Unauthorized");

      // OFFLINE GUARD: Queue in localDb if disconnected
      if (!navigator.onLine) {
        await localDb.transaction("rw", localDb.sync_queue, async () => {
          await localDb.sync_queue.add({
            action_type: "REPLY_FEEDBACK",
            status: "pending",
            payload: { feedback_id: id, reply, user_id: userId },
            retry_count: 0,
            created_at: new Date().toISOString(),
          });
        });
        window.dispatchEvent(new CustomEvent("offline-sync-queue-updated"));
        return { queuedOffline: true, id };
      }

      try {
        const response = await apiClient.put(`/feedbacks/${id}/reply`, { reply });
        return response.data;
      } catch (err) {
        const isNetworkFailure =
          !err.response ||
          (err.response?.status === 503 &&
            err.response?.data?.error === "Network Error / Offline");

        if (isNetworkFailure) {
          await localDb.transaction("rw", localDb.sync_queue, async () => {
            await localDb.sync_queue.add({
              action_type: "REPLY_FEEDBACK",
              status: "pending",
              payload: { feedback_id: id, reply, user_id: userId },
              retry_count: 0,
              created_at: new Date().toISOString(),
            });
          });
          window.dispatchEvent(new CustomEvent("offline-sync-queue-updated"));
          return { queuedOffline: true, id };
        }
        throw err;
      }
    },
    onSuccess: (data, variables) => {
      if (data?.queuedOffline) {
        toast.success("Offline: Reply queued and will send when connected.", {
          icon: "📦",
        });
        loadOfflineFeedbacks();
      } else {
        toast.success("Reply sent successfully.");
      }
      // TanStack Query v5 Object Invalidation
      queryClient.invalidateQueries({ queryKey: ["userFeedbacks", userId] });
      setReplyInputs((prev) => ({ ...prev, [variables.id]: "" }));
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