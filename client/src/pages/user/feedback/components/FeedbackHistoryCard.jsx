import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, ArrowUp01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import {
  getTypeBadgeClasses,
  getStatusBadgeClasses,
  getStatusIcon,
  formatMessageTimestamp,
} from "../../../../utils/feedbackFormatters";

export default function FeedbackHistoryCard({
  item,
  isExpanded,
  toggleExpand,
  replyInputs,
  handleReplyChange,
  handleSubmitUserReply,
  userReplyMutation,
}) {
  const StatusIcon = getStatusIcon(item.status);
  const ticketId = item.feedback_id || item.id;
  const lastMsg = item.thread?.[item.thread.length - 1];

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 overflow-hidden transition-all">
      {/* Summary row — always visible, clickable to toggle */}
      <button
        type="button"
        onClick={() => toggleExpand(ticketId)}
        className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-gray-100/60 transition-colors"
      >
        {/* Status + type badges */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getTypeBadgeClasses(item.type)}`}>
            {item.type}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getStatusBadgeClasses(item.status)}`}>
            <HugeiconsIcon icon={StatusIcon} className="w-3 h-3" />
            {item.status}
          </span>
        </div>

        {/* Subject + preview */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{item.subject}</p>
          {!isExpanded && lastMsg && (
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {lastMsg.sender_type === "admin" ? "Office: " : "You: "}{lastMsg.message}
            </p>
          )}
        </div>

        {/* Date + chevron */}
        <div className="flex items-center gap-2 shrink-0 text-gray-400">
          <span className="text-xs hidden sm:block">
            {new Date(item.created_at || item.createdAt).toLocaleDateString()}
          </span>
          <HugeiconsIcon
            icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon}
            className="w-4 h-4"
          />
        </div>
      </button>

      {/* Expanded thread */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <p className="text-xs text-gray-400 pt-3 mb-4">
            Submitted: {new Date(item.created_at || item.createdAt).toLocaleString()}
            {" · "}
            {item.recipient === "mdrrmo" ? "MDRRMO" : "Barangay"}
          </p>

          {/* Message Thread */}
          <div className="space-y-4 flex flex-col">
            {item.thread?.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex w-full ${
                  msg.sender_type === "resident" ? "justify-end" : "justify-start"
                }`}
              >
                <div className={`rounded-2xl border p-4 max-w-[85%] sm:max-w-[75%] ${
                  msg.sender_type === "resident"
                    ? "bg-white border-gray-100"
                    : "bg-blue-50 border-blue-100"
                }`}>
                  <p className={`text-xs font-bold uppercase tracking-wide mb-2 flex flex-wrap items-center justify-between gap-4 ${
                    msg.sender_type === "resident" ? "text-gray-400" : "text-blue-700"
                  }`}>
                    <span>{msg.sender_type === "resident" ? "Your Message" : "Office Response"}</span>
                    <span className="font-semibold text-[10px] text-gray-400 normal-case whitespace-nowrap">
                      {formatMessageTimestamp(msg.created_at, item.thread[idx - 1]?.created_at, idx)}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Input */}
          {item.status !== "Closed" && item.thread?.some((m) => m.sender_type === "admin") && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <textarea
                rows={3}
                placeholder="Write your follow-up reply..."
                value={replyInputs[item.id] || ""}
                onChange={(e) => handleReplyChange(item.id, e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 mb-2"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => handleSubmitUserReply(item.id)}
                  disabled={userReplyMutation.isPending}
                  className="px-5 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:bg-slate-400 flex items-center gap-2"
                >
                  <HugeiconsIcon icon={SentIcon} className="w-4 h-4" />
                  {userReplyMutation.isPending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
