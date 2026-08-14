import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserCircleIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  CancelCircleIcon,
  MailReply01Icon,
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
  handleOpenReplyModal,
  setTicketToClose,
}) {
  const ticketId = item.feedback_id || item.id;
  const lastMsg = item.thread?.[item.thread.length - 1];
  const StatusIcon = getStatusIcon(item.status);

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 overflow-hidden">
      {/* Summary row — always visible */}
      <button
        type="button"
        onClick={() => toggleExpand(ticketId)}
        className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-gray-100/60 transition-colors"
      >
        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getTypeBadgeClasses(item.type)}`}>
            {item.type}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getStatusBadgeClasses(item.status)}`}>
            <HugeiconsIcon icon={StatusIcon} className="w-3 h-3" />
            {item.status}
          </span>
        </div>

        {/* Subject + resident preview */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{item.subject}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {item.resident_name || item.user_id}
            {(item.barangay_name || item.barangay) && ` · Bgry. ${item.barangay_name || item.barangay}`}
            {!isExpanded && lastMsg && ` · ${lastMsg.sender_type === "admin" ? "You: " : "Resident: "}${lastMsg.message}`}
          </p>
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

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500 pt-3 mb-4">
            <HugeiconsIcon icon={UserCircleIcon} className="w-4 h-4 text-gray-400" />
            <span>{item.resident_name || item.user_id}</span>
            {(item.barangay_name || item.barangay) && (
              <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md">
                Barangay {item.barangay_name || item.barangay}
              </span>
            )}
            <span className="text-gray-400">· Routed to: {item.recipient === "mdrrmo" ? "MDRRMO" : "Barangay"}</span>
            <span className="text-gray-400">· {new Date(item.created_at || item.createdAt).toLocaleString()}</span>
          </div>

          {/* Message Thread */}
          <div className="space-y-3 flex flex-col">
            {item.thread?.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex w-full ${
                  msg.sender_type === "admin" ? "justify-end" : "justify-start"
                }`}
              >
                <div className={`rounded-2xl border p-4 max-w-[85%] sm:max-w-[75%] ${
                  msg.sender_type === "admin"
                    ? "bg-blue-50/80 border-blue-100"
                    : "bg-white border-gray-100"
                }`}>
                  <div className="flex justify-between items-center mb-1 gap-4">
                    <p className={`text-xs font-bold uppercase tracking-wide ${
                      msg.sender_type === "admin" ? "text-blue-700" : "text-gray-400"
                    }`}>
                      {msg.sender_type === "admin" ? "Official Response" : "Resident Message"}
                    </p>
                    <span className="text-[10px] text-gray-400 font-semibold whitespace-nowrap">
                      {formatMessageTimestamp(msg.created_at, item.thread[idx - 1]?.created_at, idx)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-gray-100 justify-end">
            {item.status !== "Closed" && (
              <button
                onClick={() => setTicketToClose(item)}
                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-bold rounded-xl transition-colors flex items-center gap-2 border border-gray-200"
              >
                <HugeiconsIcon icon={CancelCircleIcon} className="w-4 h-4" />
                Close Thread
              </button>
            )}
            <button
              onClick={() => handleOpenReplyModal(item)}
              className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <HugeiconsIcon icon={MailReply01Icon} className="w-4 h-4" />
              Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
