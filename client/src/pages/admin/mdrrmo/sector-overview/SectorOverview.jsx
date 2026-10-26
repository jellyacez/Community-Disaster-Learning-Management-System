import { useState, lazy, Suspense } from "react";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { useSectorData } from "./hooks/useSectorData";
import { useSectorTable } from "./hooks/useSectorTable";

import SectorHeader from "./components/SectorHeader";
import SectorInsights from "./components/SectorInsights";
import SectorKPIs from "./components/SectorKPIs";
import SectorLeaderboard from "./components/SectorLeaderboard";
import SectorDataTable from "./components/SectorDataTable";
import { SkeletonChart } from "../../../../components/ui/Skeleton";

const SectorCategoryChart = lazy(() => import("./components/SectorCategoryChart"));

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

      {isError ? (
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
            isLoading={isLoading}
          />

          <SectorKPIs kpiData={kpiData} trends={trends} isLoading={isLoading} />

          {/* Tier 2: Chart Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <SectorLeaderboard
              top5={top5}
              bottom5={bottom5}
              selectedBarangayId={selectedBarangayId}
              handleRowClick={handleRowClick}
              isLoading={isLoading}
            />

            <Suspense
              fallback={
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm flex flex-col h-full min-h-[380px] items-center justify-center">
                  <SkeletonChart type="donut" height={200} />
                </div>
              }
            >
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
                isBreakdownLoading={isLoading || isBreakdownLoading}
                breakdownData={breakdownData}
              />
            </Suspense>
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
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
}
