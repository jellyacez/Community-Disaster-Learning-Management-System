import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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

  // Automatically reset to page 1 whenever any filter or search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedBarangay, selectedModule, selectedStatus]);

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
    keepPreviousData: true,
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
