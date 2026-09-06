import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Notification01Icon, Alert01Icon } from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";

export default function AnnouncementModal({ isOpen, onClose, barangayName = "Your Jurisdiction" }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSafeClose = () => {
    if (title.trim() || content.trim()) {
      if (window.confirm("Discard unsaved announcement draft?")) {
        setTitle("");
        setContent("");
        onClose();
      }
    } else {
      setTitle("");
      setContent("");
      onClose();
    }
  };

  // Keyboard shortcut: Escape to close with unsaved guard
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleSafeClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, title, content]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post("/admin/barangay/announcements", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success(`Announcement broadcasted successfully to Barangay ${barangayName}!`);
      queryClient.invalidateQueries({ queryKey: ["barangayWorkspaceOverview"] });
      setTitle("");
      setContent("");
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Failed to publish announcement.");
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both title and content.");
      return;
    }
    mutation.mutate({ title, content });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <HugeiconsIcon icon={Notification01Icon} className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Broadcast Local Advisory</h3>
                <span className="text-[10px] font-mono font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded">
                  {barangayName}
                </span>
              </div>
              <p className="text-xs text-gray-500">Publish notices strictly to Barangay {barangayName} residents</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSafeClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 font-mono">
              Advisory Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Flood Drill Schedule / Heavy Rain Advisory"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 font-mono">
              Content & Safety Instructions
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter specific guidelines, evacuation assembly locations, or safety reminders..."
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition resize-none"
              required
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex items-start gap-2.5 text-xs">
            <HugeiconsIcon icon={Alert01Icon} className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              This message will appear immediately on the announcement boards of registered residents in <strong>Barangay {barangayName}</strong>.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSafeClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {mutation.isPending ? "Publishing..." : "Broadcast Alert"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}