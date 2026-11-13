import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import useDebounce from "../../../../../hooks/useDebounce";

export function useExpiringFeed() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const debouncedSearch = useDebounce(searchInput, 350);

  // Reset to page 1 whenever any filter or search changes (adjusted during render, not in an effect)
  const filterKey = [debouncedSearch, selectedBarangay, selectedModule, selectedStatus].join("\u0000");
  const [pagedFilterKey, setPagedFilterKey] = useState(filterKey);
  if (filterKey !== pagedFilterKey) {
    setPagedFilterKey(filterKey);
    setPage(1);
  }

  const query = useQuery({
    queryKey: [
      "mdrrmoCertFeed",
      page,
      limit,
      debouncedSearch,
      selectedBarangay,
      selectedModule,
      selectedStatus,
    ],
    queryFn: async () => {
      const params = {
        page,
        limit,
        search: debouncedSearch,
        barangayId: selectedBarangay,
        moduleId: selectedModule,
        status: selectedStatus,
      };
      const res = await apiClient.get("/admin/mdrrmo/certifications/feed", { params });
      return res.data.data;
    },
    placeholderData: keepPreviousData,
    refetchInterval: 60000,
  });

  const handleResetFilters = () => {
    setSearchInput("");
    setSelectedBarangay("");
    setSelectedModule("");
    setSelectedStatus("");
    setPage(1);
  };

  return {
    ...query,
    page,
    setPage,
    limit,
    setLimit,
    searchInput,
    setSearchInput,
    selectedBarangay,
    setSelectedBarangay,
    selectedModule,
    setSelectedModule,
    selectedStatus,
    setSelectedStatus,
    handleResetFilters,
    hasActiveFilters: Boolean(searchInput || selectedBarangay || selectedModule || selectedStatus),
  };
}
