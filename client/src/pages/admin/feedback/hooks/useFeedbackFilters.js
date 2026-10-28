import { useState } from "react";
import useDebounce from "../../../../hooks/useDebounce";

// Filter, sort and paging state for the feedback inbox. The server applies all of it
// (see useAdminFeedbacks), so only one page of tickets is ever downloaded.
export function useFeedbackFilters() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest" | "status"
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Reset to page 1 whenever filters change
  const handleTabChange = (key) => { setActiveTab(key); setCurrentPage(1); };
  const handleSearchChange = (e) => { setSearchQuery(e.target.value); setCurrentPage(1); };
  const handleSortChange = (e) => { setSortOrder(e.target.value); setCurrentPage(1); };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return {
    activeTab,
    searchQuery,
    debouncedSearch,
    sortOrder,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    handleTabChange,
    handleSearchChange,
    handleSortChange,
  };
}

// Tab labels with the per-status totals the server returns alongside each page
export function buildFeedbackTabs(counts) {
  return [
    { key: "all", label: "All Tickets", count: counts?.all ?? 0 },
    { key: "pending", label: "Needs Response", count: counts?.pending ?? 0 },
    { key: "replied", label: "Replied", count: counts?.replied ?? 0 },
    { key: "closed", label: "Closed / Resolved", count: counts?.closed ?? 0 },
  ];
}
