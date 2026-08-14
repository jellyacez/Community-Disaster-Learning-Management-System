import { useState } from "react";
import useDocumentTitle from "../../../hooks/useDocumentTitle";
import { authClient } from "../../../lib/auth-client";

// Hooks
import { useAdminFeedbacks } from "./hooks/useAdminFeedbacks";
import { useFeedbackFilters } from "./hooks/useFeedbackFilters";

// Components
import FeedbackHeader from "./components/FeedbackHeader";
import FeedbackFilters from "./components/FeedbackFilters";
import FeedbackList from "./components/FeedbackList";

export default function AdminFeedbackManager() {
  useDocumentTitle("Feedback Management | Bacolor LMS Admin");

  // 1. Get logged-in admin session & role
  const { data: session } = authClient.useSession();
  const adminId = session?.user?.id;
  const adminRole = session?.user?.role || "barangay_admin";
  const isMdrrmoOrSystem =
    adminRole.includes("mdrrmo") || adminRole === "system_admin";

  // Expansion state
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 2. Custom hooks
  const [selectedBarangayFilter, setSelectedBarangayFilter] = useState("all");

  const {
    submissions,
    isLoading,
    replyMutation,
    closeMutation,
  } = useAdminFeedbacks(adminId, adminRole, selectedBarangayFilter, isMdrrmoOrSystem);

  const {
    activeTab,
    searchQuery,
    sortOrder,
    currentPage,
    setCurrentPage,
    PAGE_SIZE,
    filteredSubmissions,
    totalPages,
    paginatedSubmissions,
    tabs,
    handleTabChange,
    handleSearchChange,
    handleSortChange,
  } = useFeedbackFilters(submissions);

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <FeedbackHeader
        isMdrrmoOrSystem={isMdrrmoOrSystem}
        selectedBarangayFilter={selectedBarangayFilter}
        setSelectedBarangayFilter={setSelectedBarangayFilter}
      />

      {/* Main Inbox */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <FeedbackFilters
          tabs={tabs}
          activeTab={activeTab}
          handleTabChange={handleTabChange}
          searchQuery={searchQuery}
          handleSearchChange={handleSearchChange}
          sortOrder={sortOrder}
          handleSortChange={handleSortChange}
        />

        <FeedbackList
          isLoading={isLoading}
          filteredSubmissions={filteredSubmissions}
          paginatedSubmissions={paginatedSubmissions}
          activeTab={activeTab}
          currentPage={currentPage}
          PAGE_SIZE={PAGE_SIZE}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
          replyMutation={replyMutation}
          closeMutation={closeMutation}
        />
      </div>
    </div>
  );
}
