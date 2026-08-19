import { useState, useMemo } from "react";

export function useSectorTable(sectorData) {
  const [sortConfig, setSortConfig] = useState({ key: 'barangay', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minResidents: '',
    minCompletion: '',
    maxCompletion: '',
    status: 'All'
  });

  const activeFiltersCount = 
    (filters.minResidents !== '' ? 1 : 0) + 
    (filters.minCompletion !== '' ? 1 : 0) + 
    (filters.maxCompletion !== '' ? 1 : 0) + 
    (filters.status !== 'All' ? 1 : 0);

  const sortedData = useMemo(() => {
    let filteredData = sectorData || [];
    
    if (searchQuery.trim()) {
      filteredData = filteredData.filter(d => 
        d.barangay.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.minResidents !== '') {
      filteredData = filteredData.filter(d => d.resident_count >= Number(filters.minResidents));
    }
    
    if (filters.minCompletion !== '') {
      filteredData = filteredData.filter(d => d.avg_completion_rate >= Number(filters.minCompletion));
    }

    if (filters.maxCompletion !== '') {
      filteredData = filteredData.filter(d => d.avg_completion_rate <= Number(filters.maxCompletion));
    }

    if (filters.status === 'Covered') {
      filteredData = filteredData.filter(d => d.resident_count > 0);
    } else if (filters.status === 'Zero Coverage') {
      filteredData = filteredData.filter(d => d.resident_count === 0);
    }
    
    let sortableData = [...filteredData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        // Keep Unassigned at the bottom regardless of sort
        if (a.barangay === 'Unassigned') return 1;
        if (b.barangay === 'Unassigned') return -1;
        
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [sectorData, sortConfig, searchQuery, filters]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return {
    sortConfig,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    activeFiltersCount,
    sortedData,
    requestSort,
  };
}
