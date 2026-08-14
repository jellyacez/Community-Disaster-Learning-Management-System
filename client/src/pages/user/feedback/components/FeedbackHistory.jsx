import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import FeedbackHistoryCard from "./FeedbackHistoryCard";
import { useFeedbackHistory } from "../hooks/useFeedbackHistory";

export default function FeedbackHistory({ userId, activeTab, setActiveTab }) {
  const {
    submissions,
    isLoading,
    filteredSubmissions,
    tabs,
    searchQuery,
    setSearchQuery,
    expandedIds,
    toggleExpand,
    replyInputs,
    handleReplyChange,
    handleSubmitUserReply,
    userReplyMutation,
  } = useFeedbackHistory(userId, activeTab);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">
            Communication History
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track your submitted concerns, inquiries, feedback, and reports.
          </p>
        </div>

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

      {/* Search */}
      <div className="relative mb-4">
        <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by subject or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400 font-bold">
          Loading communication history...
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <HugeiconsIcon
            icon={Message01Icon}
            className="w-12 h-12 text-gray-300 mx-auto mb-4"
          />
          <h3 className="text-2xl font-black text-gray-900 mb-2">
            No communication history yet
          </h3>
          <p className="text-gray-500 max-w-xl mx-auto mb-2">
            You haven't submitted any feedback, reports, concerns, or
            inquiries yet.
          </p>
          <p className="text-sm text-gray-400">
            Your submitted messages will appear here once you send your first
            communication.
          </p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <p className="text-lg font-bold text-gray-800 mb-2">
            No messages in this category
          </p>
          <p className="text-sm text-gray-500">
            Try switching tabs or submit a new message to populate this
            communication history.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((item) => (
            <FeedbackHistoryCard
              key={item.feedback_id || item.id}
              item={item}
              isExpanded={expandedIds.has(item.feedback_id || item.id)}
              toggleExpand={toggleExpand}
              replyInputs={replyInputs}
              handleReplyChange={handleReplyChange}
              handleSubmitUserReply={handleSubmitUserReply}
              userReplyMutation={userReplyMutation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
