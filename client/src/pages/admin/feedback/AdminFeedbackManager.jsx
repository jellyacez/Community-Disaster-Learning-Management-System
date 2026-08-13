import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useDocumentTitle from "../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Message01Icon,
  Clock01Icon,
  MailReply01Icon,
  CancelCircleIcon,
  SentIcon,
  UserCircleIcon,
  FilterIcon,
} from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import apiClient from "../../../lib/apiClient";
import { authClient } from "../../../lib/auth-client";
import { BARANGAY_LIST } from "../../../constants/barangays";



export default function AdminFeedbackManager() {
  useDocumentTitle("Feedback Management | Bacolor LMS Admin");
  const queryClient = useQueryClient();

  // 1. Get logged-in admin session & role
  const { data: session } = authClient.useSession();
  const adminId = session?.user?.id;
  const adminRole = session?.user?.role || "barangay_admin";
  const isMdrrmoOrSystem =
    adminRole.includes("mdrrmo") || adminRole === "system_admin";

  // UI Filters
  const [activeTab, setActiveTab] = useState("all");
  const [selectedBarangayFilter, setSelectedBarangayFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [targetStatus, setTargetStatus] = useState("Replied");

  // 2. FETCH FEEDBACKS
    const { data: submissions = [], isLoading } = useQuery({
      queryKey: ["adminFeedbacks", adminRole, selectedBarangayFilter],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (isMdrrmoOrSystem && selectedBarangayFilter !== "all") {
          params.append("barangay_id", selectedBarangayFilter);
        }

        const response = await apiClient.get(`/admin/mdrrmo/feedback?${params.toString()}`);
        return response.data.data || [];
      },
      enabled: !!adminId,
    });


    const replyMutation = useMutation({
      mutationFn: async ({ feedbackId, reply, status }) => {

        const response = await apiClient.put(`/admin/mdrrmo/feedback/${feedbackId}/reply`, {
          reply,
          status,
          replied_by: adminId,
        });
        return response.data;
      },
      onSuccess: () => {
        toast.success("Official response sent successfully!");
        queryClient.invalidateQueries({ queryKey: ["adminFeedbacks"] });
        setSelectedTicket(null);
        setReplyText("");
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Failed to submit reply.");
      },
    });

  const handleOpenReplyModal = (ticket) => {
    setSelectedTicket(ticket);
    setReplyText("");
    setTargetStatus(ticket.status === "Pending" ? "Replied" : ticket.status);
  };

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
    });
  };

  const getTypeBadgeClasses = (type) => {
    switch (type) {
      case "report":
        return "bg-red-100 text-red-700";
      case "concern":
        return "bg-amber-100 text-amber-700";
      case "inquiry":
        return "bg-blue-100 text-blue-700";
      case "feedback":
      default:
        return "bg-emerald-100 text-emerald-700";
    }
  };

  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case "Closed":
        return "bg-gray-200 text-gray-700";
      case "Replied":
        return "bg-blue-100 text-blue-700";
      case "Pending":
      default:
        return "bg-amber-100 text-amber-700";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Closed":
        return CancelCircleIcon;
      case "Replied":
        return MailReply01Icon;
      case "Pending":
      default:
        return Clock01Icon;
    }
  };

  const filteredSubmissions = useMemo(() => {
    if (activeTab === "all") return submissions;
    return submissions.filter(
      (item) => item.status.toLowerCase() === activeTab.toLowerCase()
    );
  }, [activeTab, submissions]);

  const tabs = useMemo(
    () => [
      { key: "all", label: "All Tickets", count: submissions.length },
      {
        key: "pending",
        label: "Needs Response",
        count: submissions.filter((item) => item.status === "Pending").length,
      },
      {
        key: "replied",
        label: "Replied",
        count: submissions.filter((item) => item.status === "Replied").length,
      },
      {
        key: "closed",
        label: "Closed / Resolved",
        count: submissions.filter((item) => item.status === "Closed").length,
      },
    ],
    [submissions]
  );

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            {isMdrrmoOrSystem ? "MDRRMO Municipal Feedback Desk" : "Barangay Feedback Desk"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {isMdrrmoOrSystem
              ? "Review communications across all municipal barangays."
              : "Review communications submitted by residents in your barangay."}
          </p>
        </div>

        {/* BARANGAY FILTER (ONLY VISIBLE FOR MDRRMO / SYSTEM ADMIN) */}
        {isMdrrmoOrSystem && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-sm">
            <HugeiconsIcon icon={FilterIcon} className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase">Barangay:</span>
            <select
              value={selectedBarangayFilter}
              onChange={(e) => setSelectedBarangayFilter(e.target.value)}
              className="bg-transparent text-sm font-bold text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value="all">All Barangays (Municipal View)</option>
              {BARANGAY_LIST.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Analytics Summary removed as per user request (duplicate of filter tabs) */}

      {/* Main Inbox */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900">
            Incoming Communication Queue
          </h2>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === tab.key
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400 font-bold">
            Loading communications...
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
            <HugeiconsIcon
              icon={Message01Icon}
              className="w-12 h-12 text-gray-300 mx-auto mb-3"
            />
            <p className="text-lg font-bold text-gray-800">
              No tickets found in this queue
            </p>
            <p className="text-sm text-gray-500 mt-1">
              There are no {activeTab === "all" ? "" : activeTab} resident communications matching your filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((item) => {
              const StatusIcon = getStatusIcon(item.status);
              return (
                <div
                  key={item.feedback_id || item.id}
                  className="rounded-3xl border border-gray-100 bg-gray-50/60 p-5 transition-hover hover:border-gray-200"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      {/* Badge bar */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getTypeBadgeClasses(item.type)}`}>
                          {item.type}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadgeClasses(item.status)}`}>
                          <HugeiconsIcon icon={StatusIcon} className="w-3.5 h-3.5" />
                          {item.status}
                        </span>
                        <span className="text-xs font-semibold text-gray-400">
                          • Submitted: {new Date(item.created_at || item.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {/* User Info & Subject */}
                      <h3 className="text-lg font-black text-gray-900">
                        {item.subject}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-600 mt-1 mb-3">
                        <HugeiconsIcon icon={UserCircleIcon} className="w-4 h-4 text-gray-400" />
                        <span>Resident: {item.resident_name || item.user_id}</span>
                        {(item.barangay_name || item.barangay) && (
                          <span className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded-md">
                            Barangay {item.barangay_name || item.barangay}
                          </span>
                        )}
                        <span className="text-gray-400">• Routed to: {item.recipient === "mdrrmo" ? "MDRRMO" : "Barangay"}</span>
                      </div>

                      {/* Message Thread */}
                      <div className="space-y-3 mt-4">
                        {item.thread?.map((msg) => (
                          <div 
                            key={msg.id} 
                            className={`rounded-2xl border p-4 ${
                              msg.sender_type === "admin" 
                                ? "bg-blue-50/80 border-blue-100 ml-8" 
                                : "bg-white border-gray-100 mr-8"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <p className={`text-xs font-bold uppercase tracking-wide ${
                                msg.sender_type === "admin" ? "text-blue-700" : "text-gray-400"
                              }`}>
                                {msg.sender_type === "admin" ? "Official Response" : "Resident Message"}
                              </p>
                              <span className="text-[10px] text-gray-400 font-semibold">
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                              {msg.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="lg:self-center">
                      <button
                        onClick={() => handleOpenReplyModal(item)}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors flex justify-center items-center gap-2"
                      >
                        <HugeiconsIcon icon={MailReply01Icon} className="w-4 h-4" />
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REPLY MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-100 shadow-2xl p-6">
            <h3 className="text-xl font-black text-gray-900">
              Respond to Ticket
            </h3>
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
      )}
    </div>
  );
}
