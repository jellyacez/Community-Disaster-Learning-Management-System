import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";
import { localDb } from "../../../../lib/localDb"; // For offline queueing

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
        await localDb.transaction("rw", localDb.sync_queue, async () => {
          await localDb.sync_queue.add({
            action_type: "SUBMIT_FEEDBACK",
            status: "pending",
            payload: { ...payload, user_id: userId },
          });
        });
        return { queuedOffline: true };
      }

      const response = await apiClient.post("/feedbacks", payload);
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.queuedOffline) {
        toast.success("Offline: Message queued and will send when connected.");
      } else {
        toast.success("Your message has been submitted.");
      }
      
      // IMPORTANT: Invalidate the history query using the exact key format
      queryClient.invalidateQueries(["userFeedbacks", userId]);
      
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
