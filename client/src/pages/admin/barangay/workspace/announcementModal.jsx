import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Notification01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";

export default function AnnouncementModal({
  isOpen,
  onClose,
  barangayName = "Your Jurisdiction",
  currentUserRole = "barangay_admin",
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("standard");
  const [targetBarangayId, setTargetBarangayId] = useState("");

  const isHighTierAdmin = [
    "system_admin",
    "head_mdrrmo_admin",
    "mdrrmo_admin",
  ].includes(currentUserRole);


  const { data: barangays = [] } = useQuery({
    queryKey: ["allBarangaysList"],
    queryFn: async () => {
      const res = await apiClient.get("/public/barangays");
      return res.data?.data || res.data || [];
    },
    enabled: isOpen && isHighTierAdmin,
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setPriority("standard");
    setTargetBarangayId("");
  };

  const handleSafeClose = () => {
    if (title.trim() || content.trim()) {
      if (window.confirm("Discard unsaved announcement draft?")) {
        resetForm();
        onClose();
      }
    } else {
      resetForm();
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleSafeClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, title, content]);

  const mutation = useMutation({
    mutationFn: async (payload) => {

      const endpoint = isHighTierAdmin
        ? "/admin/mdrrmo/announcements"
        : "/admin/barangay/announcements";
      const res = await apiClient.post(endpoint, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Announcement broadcasted successfully!");
      queryClient.invalidateQueries({ queryKey: ["barangayWorkspaceOverview"] });
      queryClient.invalidateQueries({ queryKey: ["barangayAnnouncements"] });
      queryClient.invalidateQueries({ queryKey: ["userAnnouncements"] });
      resetForm();
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

    mutation.mutate({
      title,
      content,
      priority,
      target_barangay_id: isHighTierAdmin && targetBarangayId ? targetBarangayId : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <HugeiconsIcon icon={Notification01Icon} className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  Broadcast Advisory
                </h3>
                <span className="text-[10px] font-mono font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded">
                  {isHighTierAdmin ? "MDRRMO / HQ" : barangayName}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {isHighTierAdmin
                  ? "Publish municipal alerts or sector-specific bulletins"
                  : `Publish notices strictly to Barangay ${barangayName} residents`}
              </p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Audience selection for High-tier Admins */}
          {isHighTierAdmin && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 font-mono">
                Target Sector / Audience
              </label>
              <select
                value={targetBarangayId}
                onChange={(e) => setTargetBarangayId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
              >
                <option value="">All Barangays (Municipality-Wide Broadcast)</option>
                {barangays.map((b) => (
                  <option key={b.id} value={b.id}>
                    Barangay {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2 font-mono">
              Priority Level
            </label>

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPriority("standard")}
                className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                  priority === "standard"
                    ? "border-gray-900 bg-gray-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-bold text-gray-900">Standard</p>
                <p className="text-xs text-gray-500 mt-1">
                  Regular advisory or informational post
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPriority("urgent")}
                className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                  priority === "urgent"
                    ? "border-red-600 bg-red-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-bold text-red-700">Urgent</p>
                <p className="text-xs text-gray-500 mt-1">
                  High-priority advisory requiring immediate attention
                </p>
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex items-start gap-2.5 text-xs">
            <HugeiconsIcon
              icon={Alert01Icon}
              className="w-4 h-4 shrink-0 mt-0.5 text-amber-600"
            />
            <span>
              {isHighTierAdmin && !targetBarangayId
                ? "This alert will be broadcast across all registered barangays."
                : `This message will appear immediately on the boards of Barangay ${
                    targetBarangayId
                      ? barangays.find((b) => String(b.id) === String(targetBarangayId))?.name || "Target"
                      : barangayName
                  }.`}
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