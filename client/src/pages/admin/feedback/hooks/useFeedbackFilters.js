import { useState, useMemo } from "react";

export function useFeedbackFilters(submissions) {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest" | "status"
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const filteredSubmissions = useMemo(() => {
    let result = submissions;

    // 1. Tab filter
    if (activeTab !== "all") {
      result = result.filter(
        (item) => item.status.toLowerCase() === activeTab.toLowerCase()
      );
    }

    // 2. Search filter (subject, resident name, type)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.subject?.toLowerCase().includes(q) ||
          item.resident_name?.toLowerCase().includes(q) ||
          item.type?.toLowerCase().includes(q)
      );
    }

    // 3. Sort
    result = [...result].sort((a, b) => {
      if (sortOrder === "oldest") {
        return new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt);
      }
      if (sortOrder === "status") {
        const order = { Pending: 0, Replied: 1, Closed: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      }
      // "newest" default
      return new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt);
    });

    return result;
  }, [activeTab, submissions, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / PAGE_SIZE));

  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSubmissions.slice(start, start + PAGE_SIZE);
  }, [filteredSubmissions, currentPage, PAGE_SIZE]);

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

  // Reset to page 1 whenever filters change
  const handleTabChange = (key) => { setActiveTab(key); setCurrentPage(1); };
  const handleSearchChange = (e) => { setSearchQuery(e.target.value); setCurrentPage(1); };
  const handleSortChange = (e) => { setSortOrder(e.target.value); setCurrentPage(1); };

  return {
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
    handleSortChange
  };
}
