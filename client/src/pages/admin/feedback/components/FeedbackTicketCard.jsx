import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserCircleIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  CancelCircleIcon,
  MailReply01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons";
import {
  getTypeBadgeClasses,
  getStatusBadgeClasses,
  getStatusIcon,
  formatMessageTimestamp,
} from "../../../../utils/feedbackFormatters";

export default function FeedbackTicketCard({
  item,
  isExpanded,
  toggleExpand,
  replyMutation,
  closeMutation,
}) {
  const ticketId = item.feedback_id || item.id;
  const lastMsg = item.thread?.[item.thread.length - 1];
  const StatusIcon = getStatusIcon(item.status);

  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const handleSubmitReply = () => {
    if (!replyText.trim()) {
      setReplyError(true);
      return;
    }
    setReplyError(false);
    replyMutation.mutate(
      { feedbackId: ticketId, reply: replyText, status: "Replied" },
      { onSuccess: () => setReplyText("") }
    );
  };

  const handleConfirmClose = () => {
    closeMutation.mutate(ticketId, {
      onSuccess: () => setConfirmingClose(false),
    });
  };

  return (
    <div className={`rounded-2xl border border-gray-100 bg-gray-50/60 overflow-hidden ${isExpanded ? "border-b-2 border-gray-200 pb-6 mb-6" : ""}`}>
      {/* Summary row */}
      <button
        type="button"
        onClick={() => toggleExpand(ticketId)}
        className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-gray-100/60 transition-colors"
      >
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getTypeBadgeClasses(item.type)}`}>
            {item.type}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getStatusBadgeClasses(item.status)}`}>
            <HugeiconsIcon icon={StatusIcon} className="w-3 h-3" />
            {item.status}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{item.subject}</p>
          <p className="text-sm text-gray-500 truncate mt-0.5">
            {item.resident_name || item.user_id}
            {(item.barangay_name || item.barangay) && ` · Bgry. ${item.barangay_name || item.barangay}`}
            {!isExpanded && lastMsg && ` · ${lastMsg.sender_type === "admin" ? "You: " : "Resident: "}${lastMsg.message}`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-gray-400">
          <span className="text-xs hidden sm:block">
            {new Date(item.created_at || item.createdAt).toLocaleDateString()}
          </span>
          <HugeiconsIcon icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon} className="w-4 h-4" />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Metadata header — flush left */}
          <div className="px-5 pt-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500">
              <HugeiconsIcon icon={UserCircleIcon} className="w-4 h-4 text-gray-400" />
              <span>{item.resident_name || item.user_id}</span>
              {(item.barangay_name || item.barangay) && (
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md">
                  Barangay {item.barangay_name || item.barangay}
                </span>
              )}
              <span className="text-gray-400">
                · Routed to: {item.recipient === "mdrrmo" ? "MDRRMO" : "Barangay"}
              </span>
              <span className="text-gray-400">
                · {new Date(item.created_at || item.createdAt).toLocaleString()}
              </span>
            </div>
            <hr className="my-3 border-gray-100" />
          </div>

          {/* Message Thread — grouped consecutive messages */}
          <div className="px-5 flex flex-col gap-1">
            {item.thread?.map((msg, idx) => {
              const isAdmin = msg.sender_type === "admin";
              const prevMsg = item.thread[idx - 1];
              const isFirstInGroup = !prevMsg || prevMsg.sender_type !== msg.sender_type;

              return (
                <div
                  key={msg.id || idx}
                  className={`flex flex-col ${isAdmin ? "items-end" : "items-start"} ${isFirstInGroup && idx > 0 ? "mt-3" : ""}`}
                >
                  {/* Metadata: only show for first message in a consecutive group */}
                  {isFirstInGroup && (
                    <div className={`flex items-center gap-2 mb-1 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
                      <span className={`text-xs font-bold uppercase tracking-wide ${isAdmin ? "text-blue-700" : "text-gray-500"}`}>
                        {isAdmin ? "Official Response" : "Resident"}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                        {formatMessageTimestamp(msg.created_at, prevMsg?.created_at, idx)}
                      </span>
                    </div>
                  )}

                  {/* Bubble — only wraps the message text */}
                  <div
                    className={`w-fit max-w-[80%] rounded-2xl border px-4 py-2.5 ${
                      isAdmin
                        ? "bg-blue-50 border-blue-100"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <p className={`text-sm whitespace-pre-line leading-relaxed ${
                      isAdmin ? "text-blue-900" : "text-gray-700"
                    }`}>
                      {msg.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inline Reply + Close Actions */}
          {item.status !== "Closed" && (
            <div className="px-5 mt-4 pt-4 border-t border-gray-100 space-y-2">
              {confirmingClose ? (
                /* ── Close confirmation banner ── */
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <HugeiconsIcon icon={Alert01Icon} className="w-5 h-5 text-red-600 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-red-900 text-sm">Close this ticket?</span>
                      <span className="text-sm text-red-700">The resident will no longer be able to reply to this thread.</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmingClose(false)}
                      className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmClose}
                      disabled={closeMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold text-sm transition-colors"
                    >
                      {closeMutation.isPending ? "Closing..." : "Confirm Close"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <textarea
                      rows={3}
                      placeholder="Write your official reply, instructions, or resolution details..."
                      value={replyText}
                      onChange={(e) => {
                        setReplyText(e.target.value);
                        if (replyError) setReplyError(false);
                      }}
                      onClick={() => { if (replyError) setReplyError(false); }}
                      className={`w-full px-4 py-3 border rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 bg-white transition-colors ${
                        replyError
                          ? "border-red-400 focus:ring-red-300 ring-1 ring-red-300"
                          : "border-gray-200 focus:ring-blue-400"
                      }`}
                    />
                    {replyError && (
                      <p className="mt-1 text-xs text-red-500 font-medium">
                        Please enter a reply before sending.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingClose(true)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-bold rounded-xl transition-colors flex items-center gap-2 border border-gray-200"
                    >
                      <HugeiconsIcon icon={CancelCircleIcon} className="w-4 h-4" />
                      Close Ticket
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitReply}
                      disabled={replyMutation.isPending}
                      className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:bg-slate-400"
                    >
                      <HugeiconsIcon icon={MailReply01Icon} className="w-4 h-4" />
                      {replyMutation.isPending ? "Sending..." : "Reply"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {item.status === "Closed" && <div className="pb-2" />}
        </div>
      )}
    </div>
  );
}
