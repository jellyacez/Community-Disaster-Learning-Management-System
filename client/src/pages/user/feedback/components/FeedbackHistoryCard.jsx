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
    <div className={`rounded-2xl border border-gray-100 bg-gray-50/70 overflow-hidden transition-all ${isExpanded ? "border-b-2 border-gray-200 pb-6 mb-6" : ""}`}>
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
          {!isExpanded && lastMsg && (
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {lastMsg.sender_type === "admin" ? "Office: " : "You: "}{lastMsg.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 text-gray-400">
          <span className="text-xs hidden sm:block">
            {new Date(item.created_at || item.createdAt).toLocaleDateString()}
          </span>
          <HugeiconsIcon icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon} className="w-4 h-4" />
        </div>
      </button>

      {/* Expanded thread */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Metadata header — flush left */}
          <div className="px-5 pt-3">
            <p className="text-xs text-gray-400">
              Submitted: {new Date(item.created_at || item.createdAt).toLocaleString()}
              {" · "}
              Routed to: {item.recipient === "mdrrmo" ? "MDRRMO" : "Barangay"}
            </p>
            <hr className="my-3 border-gray-100" />
          </div>

          {/* Message Thread — grouped consecutive messages */}
          <div className="px-5 flex flex-col gap-1">
            {item.thread?.map((msg, idx) => {
              const isResident = msg.sender_type === "resident";
              const prevMsg = item.thread[idx - 1];
              const isFirstInGroup = !prevMsg || prevMsg.sender_type !== msg.sender_type;

              return (
                <div
                  key={msg.id || idx}
                  className={`flex flex-col ${isResident ? "items-end" : "items-start"} ${isFirstInGroup && idx > 0 ? "mt-3" : ""}`}
                >
                  {/* Metadata: only for first in a consecutive group */}
                  {isFirstInGroup && (
                    <div className={`flex items-center gap-2 mb-1 ${isResident ? "flex-row-reverse" : "flex-row"}`}>
                      <span className={`text-xs font-bold uppercase tracking-wide ${isResident ? "text-gray-400" : "text-blue-700"}`}>
                        {isResident ? "You" : "Office Response"}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                        {formatMessageTimestamp(msg.created_at, prevMsg?.created_at, idx)}
                      </span>
                    </div>
                  )}

                  {/* Bubble — only wraps the message text */}
                  <div
                    className={`w-fit max-w-[80%] rounded-2xl border px-4 py-2.5 ${
                      isResident
                        ? "bg-white border-gray-200"
                        : "bg-blue-50 border-blue-100"
                    }`}
                  >
                    <p className={`text-sm whitespace-pre-line leading-relaxed ${
                      isResident ? "text-gray-700" : "text-blue-900"
                    }`}>
                      {msg.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Input */}
          {item.status !== "Closed" && item.thread?.some((m) => m.sender_type === "admin") && (
            <div className="px-5 mt-4 pt-4 border-t border-gray-100">
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

          {item.status === "Closed" && <div className="pb-2" />}
        </div>
      )}
    </div>
  );
}
