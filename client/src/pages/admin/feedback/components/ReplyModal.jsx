import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon } from "@hugeicons/core-free-icons";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function ReplyModal({
  selectedTicket,
  setSelectedTicket,
  replyMutation,
}) {
  const [replyText, setReplyText] = useState("");
  const [targetStatus, setTargetStatus] = useState("Replied");

  useEffect(() => {
    if (selectedTicket) {
      setReplyText("");
      setTargetStatus(selectedTicket.status === "Pending" ? "Replied" : selectedTicket.status);
    }
  }, [selectedTicket]);

  if (!selectedTicket) return null;

  const handleSubmitReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      toast.error("Please enter a reply message.");
      return;
    }
    replyMutation.mutate({
      feedbackId: selectedTicket.feedback_id || selectedTicket.id,
      reply: replyText,
      status: targetStatus,
    }, {
      onSuccess: () => {
        setSelectedTicket(null);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-100 shadow-2xl p-6">
        <h3 className="text-xl font-black text-gray-900">Respond to Ticket</h3>
        <p className="text-sm text-gray-500 mt-1">
          Subject: <span className="font-semibold text-gray-800">{selectedTicket.subject}</span>
        </p>

        <form onSubmit={handleSubmitReply} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Official Office Response
            </label>
            <textarea
              rows={5}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your official reply, instructions, or resolution details..."
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Update Ticket Status
            </label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="Replied">Replied (Keep Open for Follow-up)</option>
              <option value="Closed">Closed (Mark as Fully Resolved)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={replyMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold text-sm shadow-sm transition-colors"
            >
              <HugeiconsIcon icon={SentIcon} className="w-4 h-4" />
              {replyMutation.isPending ? "Sending..." : "Submit Reply"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
