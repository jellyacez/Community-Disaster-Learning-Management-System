import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";
import { enqueueSyncTask } from "../../../../lib/LocalSave/syncManager"; // For offline queueing with fallback

export function useFeedbackSubmit(userId, setActiveTab, onDone) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    recipient: "barangay",
    type: "feedback",
    subject: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitMutation = useMutation({
    networkMode: "always",
    mutationFn: async (payload) => {
      if (!userId) throw new Error("You must be logged in to send a message.");

      // OFFLINE GUARD: Queue in localDb if disconnected
      if (!navigator.onLine) {
        const res = await enqueueSyncTask("SUBMIT_FEEDBACK", { ...payload, user_id: userId });
        if (res?.status === 'failed') {
          throw new Error(res.error || "Storage failed. Message could not be queued offline.");
        }
        return { queuedOffline: true, ...res };
      }

      try {
        const response = await apiClient.post("/feedbacks", payload);
        return response.data;
      } catch (err) {
        const isNetworkFailure = !err.response || (err.response?.status === 503 && err.response?.data?.error === 'Network Error / Offline');
        if (isNetworkFailure) {
          const res = await enqueueSyncTask("SUBMIT_FEEDBACK", { ...payload, user_id: userId });
          if (res?.status === 'failed') {
            throw new Error(res.error || "Storage failed. Message could not be queued offline.");
          }
          return { queuedOffline: true, ...res };
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      if (data?.status === 'queued_memory_only') {
        toast(data.warning || "Offline: Storage restricted. Message queued in memory only.", {
          icon: "⚠️",
          duration: 6000,
        });
      } else if (data?.queuedOffline) {
        toast.success("Offline: Message queued and will send when connected.", { icon: "📦" });
      } else {
        toast.success("Your message has been submitted.");
      }
      
      // TanStack Query v5 object syntax
      queryClient.invalidateQueries({ queryKey: ["userFeedbacks", userId] });
      
      setFormData({
        recipient: "barangay",
        type: "feedback",
        subject: "",
        message: "",
      });
      if (setActiveTab) setActiveTab("all");
      if (onDone) onDone();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to submit message.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.subject.trim()) {
      toast.error("Please enter a subject.");
      return;
    }
    if (!formData.message.trim()) {
      toast.error("Please enter your message.");
      return;
    }
    submitMutation.mutate({
      recipient: formData.recipient,
      type: formData.type,
      subject: formData.subject,
      message: formData.message,
    });
  };

  return {
    formData,
    handleChange,
    handleSubmit,
    submitMutation,
  };
}
