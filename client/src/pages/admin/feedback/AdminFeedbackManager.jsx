import { useState } from "react";
import useDocumentTitle from "../../../hooks/useDocumentTitle";
import { authClient } from "../../../lib/auth-client";

// Hooks
import { useAdminFeedbacks } from "./hooks/useAdminFeedbacks";
import { useFeedbackFilters, buildFeedbackTabs } from "./hooks/useFeedbackFilters";

// Components
import FeedbackHeader from "./components/FeedbackHeader";
import FeedbackFilters from "./components/FeedbackFilters";
import FeedbackList from "./components/FeedbackList";

export default function AdminFeedbackManager() {
  useDocumentTitle("Feedback Management | Bacolor Disaster LMS Admin");

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
    activeTab,
    searchQuery,
    debouncedSearch,
    sortOrder,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    handleTabChange,
    handleSearchChange,
    handleSortChange,
  } = useFeedbackFilters();

  const {
    submissions,
    total,
    totalPages,
    counts,
    isLoading,
    isPlaceholderData,
    replyMutation,
    closeMutation,
  } = useAdminFeedbacks(adminId, adminRole, selectedBarangayFilter, isMdrrmoOrSystem, {
    page: currentPage,
    limit: pageSize,
    status: activeTab,
    search: debouncedSearch,
    sort: sortOrder,
  });

  const tabs = buildFeedbackTabs(counts);

  // If the current page empties (e.g. its last ticket was closed under a status tab),
  // step back to the new last page; adjusted during render, not in an effect
  if (!isLoading && !isPlaceholderData && submissions.length === 0 && currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  // A different barangay is a different result set, so start from page 1
  const handleBarangayFilterChange = (value) => {
    setSelectedBarangayFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <FeedbackHeader
        isMdrrmoOrSystem={isMdrrmoOrSystem}
        selectedBarangayFilter={selectedBarangayFilter}
        setSelectedBarangayFilter={handleBarangayFilterChange}
      />

      {/* Main Inbox */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
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
          isRefreshing={isPlaceholderData}
          submissions={submissions}
          total={total}
          activeTab={activeTab}
          currentPage={currentPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
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
