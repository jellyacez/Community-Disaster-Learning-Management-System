import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, ArrowUp01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { SkeletonTableRow } from "../../../../../components/ui/Skeleton";

export default function SectorDataTable({
  sectorData,
  sortedData = [],
  searchQuery,
  setSearchQuery,
  showFilters,
  setShowFilters,
  filters,
  setFilters,
  activeFiltersCount,
  requestSort,
  sortConfig,
  selectedBarangayId,
  handleRowClick,
  isLoading
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' 
      ? <HugeiconsIcon icon={ArrowUp01Icon} className="w-3 h-3 ml-1 inline text-blue-600" />
      : <HugeiconsIcon icon={ArrowDown01Icon} className="w-3 h-3 ml-1 inline text-blue-600" />;
  };

  return (
    <div id="auditable-ledger" className="bg-white rounded-2xl border border-gray-100 shadow-sm scroll-mt-24">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 rounded-t-2xl">
        <div>
          <h3 className="font-bold text-gray-700">Auditable Ledger</h3>
          <span className="text-xs text-gray-500 font-medium">
            {searchQuery.trim() ? `Showing ${sortedData.length} of ${sectorData.length} sectors` : "Click a row to deep-dive"}
          </span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto relative">
          <div className="relative w-full sm:w-64">
            <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search barangay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-shadow"
            />
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm font-medium transition-colors ${showFilters || activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{activeFiltersCount}</span>
            )}
          </button>

          {showFilters && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 shadow-xl rounded-2xl z-50 p-4 animate-in slide-in-from-top-2 duration-150">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-900">Filters</h4>
                {activeFiltersCount > 0 && (
                  <button 
                    onClick={() => setFilters({ minResidents: '', minCompletion: '', maxCompletion: '', status: 'All' })}
                    className="text-xs text-blue-600 font-medium hover:text-blue-700"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Coverage Status</label>
                  <select 
                    value={filters.status}
                    onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="All">All Barangays</option>
                    <option value="Covered">Has Residents</option>
                    <option value="Zero Coverage">Zero Coverage</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Min. Residents</label>
                  <input 
                    type="number"
                    placeholder="e.g. 50"
                    min="0"
                    value={filters.minResidents}
                    onChange={(e) => {
                      let v = e.target.value;
                      if (v !== "") v = Math.max(0, Number(v));
                      setFilters(f => ({ ...f, minResidents: v }));
                    }}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Min. Completion Rate (%)</label>
                  <input 
                    type="number"
                    placeholder="e.g. 75"
                    min="0"
                    max="100"
                    value={filters.minCompletion}
                    onChange={(e) => {
                      let v = e.target.value;
                      if (v !== "") v = Math.max(0, Math.min(100, Number(v)));
                      setFilters(f => ({ ...f, minCompletion: v }));
                    }}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Max. Completion Rate (%)</label>
                  <input 
                    type="number"
                    placeholder="e.g. 100"
                    min="0"
                    max="100"
                    value={filters.maxCompletion}
                    onChange={(e) => {
                      let v = e.target.value;
                      if (v !== "") v = Math.max(0, Math.min(100, Number(v)));
                      setFilters(f => ({ ...f, maxCompletion: v }));
                    }}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 bg-white flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Active Filters:</span>
          {filters.status !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Status: {filters.status}
              <button onClick={() => setFilters(f => ({ ...f, status: 'All' }))} className="hover:text-blue-900">&times;</button>
            </span>
          )}
          {filters.minResidents !== '' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Min Residents: {filters.minResidents}
              <button onClick={() => setFilters(f => ({ ...f, minResidents: '' }))} className="hover:text-blue-900">&times;</button>
            </span>
          )}
          {filters.minCompletion !== '' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Min Completion: {filters.minCompletion}%
              <button onClick={() => setFilters(f => ({ ...f, minCompletion: '' }))} className="hover:text-blue-900">&times;</button>
            </span>
          )}
          {filters.maxCompletion !== '' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Max Completion: {filters.maxCompletion}%
              <button onClick={() => setFilters(f => ({ ...f, maxCompletion: '' }))} className="hover:text-blue-900">&times;</button>
            </span>
          )}
          <button 
            onClick={() => setFilters({ minResidents: '', minCompletion: '', maxCompletion: '', status: 'All' })}
            className="text-[11px] font-bold text-gray-500 hover:text-gray-900 ml-1 transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

      <div className="overflow-x-auto h-[400px] overflow-y-auto rounded-b-2xl">
        <table className="w-full text-left border-collapse relative">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
            <tr className="text-sm font-semibold text-gray-600">
              <th 
                className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => requestSort('barangay')}
              >
                Barangay {renderSortIcon('barangay')}
              </th>
              <th 
                className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => requestSort('resident_count')}
              >
                Residents {renderSortIcon('resident_count')}
              </th>
              <th 
                className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => requestSort('certificates_issued')}
              >
                Certificates {renderSortIcon('certificates_issued')}
              </th>
              <th 
                className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors w-48"
                onClick={() => requestSort('avg_completion_rate')}
              >
                Completion Rate {renderSortIcon('avg_completion_rate')}
              </th>
              <th 
                className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => requestSort('active_admins')}
              >
                Admins {renderSortIcon('active_admins')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonTableRow key={i} columns={5} />
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                  No barangays found matching "<span className="font-semibold text-gray-900">{searchQuery}</span>"
                </td>
              </tr>
            ) : (
              paginatedData.map((sector, index) => {
                const isUnassigned = sector.barangay === 'Unassigned';
                const isSelected = selectedBarangayId === (isUnassigned ? "unassigned" : sector.id);
                
                return (
                <tr 
                  key={index} 
                  onClick={() => handleRowClick(isUnassigned ? "unassigned" : sector.id)}
                  className={`transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50/50 hover:bg-blue-50' 
                      : (isUnassigned ? 'bg-yellow-50/30 hover:bg-yellow-50/60' : 'hover:bg-gray-50/60')
                  }`}
                >
                  <td className="px-6 py-3 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isSelected ? 'text-blue-700' : (isUnassigned ? 'text-yellow-800' : 'text-gray-900')}`}>
                        {sector.barangay}
                      </span>
                      {isUnassigned ? (
                        <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-yellow-200">
                          REVIEW
                        </span>
                      ) : sector.avg_completion_rate >= 80 ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200 uppercase tracking-wider">
                          Excellent
                        </span>
                      ) : sector.avg_completion_rate >= 50 ? (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-200 uppercase tracking-wider">
                          Good
                        </span>
                      ) : sector.avg_completion_rate >= 20 ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200 uppercase tracking-wider">
                          Fair
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-red-200 uppercase tracking-wider">
                          Critical
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 border-b border-gray-50 text-gray-700 font-medium tabular-nums">
                    {sector.resident_count}
                  </td>
                  <td className="px-6 py-3 border-b border-gray-50 text-gray-700 font-medium tabular-nums">
                    {sector.certificates_issued}
                  </td>
                  <td className="px-6 py-3 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isUnassigned ? 'bg-yellow-400' :
                            sector.avg_completion_rate >= 80 ? 'bg-emerald-500' :
                            sector.avg_completion_rate >= 50 ? 'bg-blue-500' :
                            sector.avg_completion_rate >= 20 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${sector.avg_completion_rate}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-600 w-9 text-right tabular-nums">{sector.avg_completion_rate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 border-b border-gray-50">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${sector.active_admins > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <span className="text-gray-700 font-medium tabular-nums">{sector.active_admins}</span>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls (Miller's Law 8 items/page) */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-2xl">
          <p className="text-xs text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
            <span className="font-bold text-gray-800">{Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)}</span> of{" "}
            <span className="font-bold text-gray-800">{sortedData.length}</span> barangays
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="min-h-[44px] px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
            >
              Previous
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPage === i + 1
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-2xs"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="min-h-[44px] px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
