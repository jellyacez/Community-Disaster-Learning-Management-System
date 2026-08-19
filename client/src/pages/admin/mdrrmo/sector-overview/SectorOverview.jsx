import { useState } from "react";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { useSectorData } from "./hooks/useSectorData";
import { useSectorTable } from "./hooks/useSectorTable";

import SectorHeader from "./components/SectorHeader";
import SectorInsights from "./components/SectorInsights";
import SectorKPIs from "./components/SectorKPIs";
import SectorLeaderboard from "./components/SectorLeaderboard";
import SectorCategoryChart from "./components/SectorCategoryChart";
import SectorDataTable from "./components/SectorDataTable";

export default function SectorOverview() {
  useDocumentTitle("Sector Overview | Admin Console");

  const [selectedBarangayId, setSelectedBarangayId] = useState(null);

  // Data fetching & derived state
  const {
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
    lastUpdated,
  } = useSectorData(selectedBarangayId);

  // Table state & handlers
  const {
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
  } = useSectorTable(sectorData);

  const handleRowClick = (id) => {
    setSelectedBarangayId(selectedBarangayId === id ? null : id);
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-150 px-6 md:px-12 pt-2 md:pt-2 pb-12">
      <SectorHeader totalResidents={totalResidents} lastUpdated={lastUpdated} />

      {isLoading ? (
        <div className="flex items-center justify-center p-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
        </div>
      ) : isError ? (
        <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center">
          <p className="font-bold text-lg">Error loading sector data.</p>
          <p className="text-sm">Please ensure the backend routes are connected.</p>
        </div>
      ) : (
        <>
          <SectorInsights
            kpiData={kpiData}
            top5={top5}
            bottom5={bottom5}
            sectorData={sectorData}
            setSearchQuery={setSearchQuery}
            setFilters={setFilters}
          />

          <SectorKPIs kpiData={kpiData} trends={trends} isLoading={isLoading} />

          {/* Tier 2: Chart Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <SectorLeaderboard
              top5={top5}
              bottom5={bottom5}
              selectedBarangayId={selectedBarangayId}
              handleRowClick={handleRowClick}
            />

            <SectorCategoryChart
              selectedBarangayId={selectedBarangayId}
              selectedBarangayName={
                selectedBarangayId
                  ? selectedBarangayId === "unassigned"
                    ? "Unassigned"
                    : sectorData.find((b) => b.id === selectedBarangayId)?.barangay
                  : "Municipality-Wide"
              }
              setSelectedBarangayId={setSelectedBarangayId}
              isBreakdownLoading={isBreakdownLoading}
              breakdownData={breakdownData}
            />
          </div>

          <SectorDataTable
            sectorData={sectorData}
            sortedData={sortedData}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            filters={filters}
            setFilters={setFilters}
            activeFiltersCount={activeFiltersCount}
            requestSort={requestSort}
            sortConfig={sortConfig}
            selectedBarangayId={selectedBarangayId}
            handleRowClick={handleRowClick}
          />
        </>
      )}
    </div>
  );
}
