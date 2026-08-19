import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";

const fetchSectorOverview = async () => {
  const res = await apiClient.get("/admin/mdrrmo/sector-overview");
  return res.data; // Returns { data: [...], trends: {...} }
};

const fetchCategoryBreakdown = async (barangayId) => {
  let url = "/admin/mdrrmo/sector-overview/category-breakdown";
  if (barangayId) {
    // If it's unassigned, pass 'unassigned'. Otherwise the ID.
    url += `?barangay_id=${barangayId}`;
  }
  const res = await apiClient.get(url);
  return res.data.data;
};

export function useSectorData(selectedBarangayId) {
  const { data: sectorResponse, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ["sectorOverview"],
    queryFn: fetchSectorOverview,
    retry: 1,
    refetchInterval: 15000 // Automatically refresh every 15 seconds
  });

  const sectorData = sectorResponse?.data || [];
  const trends = sectorResponse?.trends || null;

  const { data: breakdownData = [], isLoading: isBreakdownLoading } = useQuery({
    queryKey: ["categoryBreakdown", selectedBarangayId],
    queryFn: () => fetchCategoryBreakdown(selectedBarangayId),
    retry: 1,
    refetchInterval: 15000 // Automatically refresh every 15 seconds
  });

  const totalResidents = sectorData.reduce((acc, curr) => acc + curr.resident_count, 0);

  const kpiData = useMemo(() => {
    if (!sectorData || sectorData.length === 0) return null;
    
    // Filter out 'Unassigned' for most barangay-specific metrics
    const realBarangays = sectorData.filter(b => b.barangay !== 'Unassigned');

    const totalCertified = sectorData.reduce((acc, curr) => acc + (curr.certified_responders || 0), 0);
    const coveredBarangays = realBarangays.filter(b => b.resident_count > 0).length;
    const belowThreshold = realBarangays.filter(b => b.resident_count > 0 && b.avg_completion_rate === 0).length;

    // Most active: sort by avg_completion_rate desc, then certificates_issued desc
    const activeSorted = [...realBarangays].sort((a, b) => b.avg_completion_rate - a.avg_completion_rate || b.certificates_issued - a.certificates_issued);
    const mostActive = activeSorted[0];

    return { 
      totalCertified, 
      coveredBarangays, 
      belowThreshold, 
      mostActiveName: mostActive && mostActive.avg_completion_rate > 0 ? mostActive.barangay : "None",
      mostActiveRate: mostActive && mostActive.avg_completion_rate > 0 ? mostActive.avg_completion_rate : 0
    };
  }, [sectorData]);

  // Derived data for Leaderboard
  const { top5, bottom5 } = useMemo(() => {
    if (!sectorData || sectorData.length === 0) return { top5: [], bottom5: [] };
    const realBarangays = sectorData.filter(b => b.barangay !== 'Unassigned' && b.resident_count > 0);
    const sorted = [...realBarangays].sort((a, b) => b.avg_completion_rate - a.avg_completion_rate || b.certificates_issued - a.certificates_issued);
    
    const top = sorted.slice(0, 5);
    const bottom = sorted.slice(-5).filter(b => !top.find(t => t.id === b.id));
    return { top5: top, bottom5: bottom };
  }, [sectorData]);

  const lastUpdated = dataUpdatedAt ? new Intl.DateTimeFormat('en-US', { 
    month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'
  }).format(new Date(dataUpdatedAt)) : 'Just now';

  return {
    sectorData,
    trends,
    breakdownData,
    isLoading,
    isBreakdownLoading,
    isError,
    totalResidents,
    kpiData,
    top5,
    bottom5,
    lastUpdated
  };
}
