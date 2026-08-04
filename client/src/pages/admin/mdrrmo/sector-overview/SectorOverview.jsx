import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import apiClient from "../../../../lib/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon, ArrowDown01Icon, Search01Icon, StarAward01Icon, Alert01Icon, UserGroupIcon, Home01Icon } from "@hugeicons/core-free-icons";
import StatCard from "../../system/overview/components/StatCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const fetchSectorOverview = async () => {
  const res = await apiClient.get("/admin/mdrrmo/sector-overview");
  return res.data.data;
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

const PIE_COLORS = ["#3B82F6", "#EF4444", "#10B981", "#8B5CF6", "#F59E0B"];

export default function SectorOverview() {
  useDocumentTitle("Sector Overview | Admin Console");

  const [sortConfig, setSortConfig] = useState({ key: 'barangay', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBarangayId, setSelectedBarangayId] = useState(null);

  const { data: sectorData = [], isLoading, isError } = useQuery({
    queryKey: ["sectorOverview"],
    queryFn: fetchSectorOverview,
    retry: 1
  });

  const { data: breakdownData = [], isLoading: isBreakdownLoading } = useQuery({
    queryKey: ["categoryBreakdown", selectedBarangayId],
    queryFn: () => fetchCategoryBreakdown(selectedBarangayId),
    retry: 1
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
      mostActiveName: mostActive && mostActive.avg_completion_rate > 0 ? mostActive.barangay : "None" 
    };
  }, [sectorData]);

  // Derived data for Leaderboard
  const leaderboardData = useMemo(() => {
    if (!sectorData || sectorData.length === 0) return [];
    const realBarangays = sectorData.filter(b => b.barangay !== 'Unassigned' && b.resident_count > 0);
    const sorted = [...realBarangays].sort((a, b) => b.avg_completion_rate - a.avg_completion_rate || b.certificates_issued - a.certificates_issued);
    
    // Get Top 5 and Bottom 5 (avoid overlap if < 10 barangays)
    const top5 = sorted.slice(0, 5);
    const bottom5 = sorted.slice(-5).filter(b => !top5.find(t => t.id === b.id)).reverse(); // reverse so absolute bottom is first or last? Let's just keep descending order
    
    // Let's combine them into a single array, marking them
    return [
      ...top5.map(d => ({ ...d, group: 'Top 5' })),
      ...bottom5.map(d => ({ ...d, group: 'Bottom 5' }))
    ];
  }, [sectorData]);

  const sortedData = useMemo(() => {
    let filteredData = sectorData;
    if (searchQuery.trim()) {
      filteredData = filteredData.filter(d => 
        d.barangay.toLowerCase().includes(searchQuery.toLowerCase())
      );
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
  }, [sectorData, sortConfig, searchQuery]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' 
      ? <HugeiconsIcon icon={ArrowUp01Icon} className="w-3 h-3 ml-1 inline text-blue-600" />
      : <HugeiconsIcon icon={ArrowDown01Icon} className="w-3 h-3 ml-1 inline text-blue-600" />;
  };

  const handleRowClick = (id) => {
    setSelectedBarangayId(selectedBarangayId === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center">
        <p className="font-bold text-lg">Error loading sector data.</p>
        <p className="text-sm">Please ensure the backend routes are connected.</p>
      </div>
    );
  }

  const selectedBarangayName = selectedBarangayId 
    ? (selectedBarangayId === "unassigned" ? "Unassigned" : sectorData.find(b => b.id === selectedBarangayId)?.barangay) 
    : "Municipality-Wide";

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-150 px-6 md:px-12 pt-2 md:pt-2 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Sector Overview</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">Total Residents Across All Barangays: {totalResidents}</p>
      </div>

      {/* Tier 1: KPI Banner */}
      {kpiData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={StarAward01Icon}
            label="Most Active Sector"
            value={kpiData.mostActiveName}
            sub="Highest completion rate"
            color="green"
            isNumeric={false}
            loading={isLoading}
          />
          <StatCard
            icon={Alert01Icon}
            label="Below Threshold"
            value={kpiData.belowThreshold}
            sub="Sectors with 0% completion"
            color="red"
            loading={isLoading}
          />
          <StatCard
            icon={UserGroupIcon}
            label="Certified Responders"
            value={kpiData.totalCertified}
            sub="Residents with active certs"
            color="blue"
            loading={isLoading}
          />
          <StatCard
            icon={Home01Icon}
            label="Barangays Covered"
            value={kpiData.coveredBarangays + " / 21"}
            sub="Sectors with registered users"
            color="purple"
            isNumeric={false}
            loading={isLoading}
          />
        </div>
      )}

      {/* Tier 2: Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Leaderboard */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Preparedness Leaderboard</h2>
          <p className="text-sm text-gray-500 mb-6">Top 5 and Bottom 5 barangays by average completion rate.</p>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={leaderboardData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    handleRowClick(data.activePayload[0].payload.id);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(val) => `${val}%`} stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="barangay" type="category" stroke="#4B5563" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value) => [`${value}%`, 'Completion Rate']}
                />
                <Bar 
                  dataKey="avg_completion_rate" 
                  radius={[0, 4, 4, 0]} 
                  cursor="pointer"
                >
                  {leaderboardData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.id === selectedBarangayId ? "#3B82F6" : (entry.group === 'Top 5' ? "#10B981" : "#F43F5E")} 
                      fillOpacity={selectedBarangayId && entry.id !== selectedBarangayId ? 0.3 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Category Deep-Dive */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Category Breakdown</h2>
              <p className="text-sm text-gray-500">Active certificates for <span className="font-semibold text-gray-900">{selectedBarangayName}</span></p>
            </div>
            {selectedBarangayId && (
              <button 
                onClick={() => setSelectedBarangayId(null)}
                className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
              >
                Clear Selection
              </button>
            )}
          </div>
          
          <div className="flex-1 min-h-[300px] flex items-center justify-center">
            {isBreakdownLoading ? (
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-32 h-32 bg-gray-200 rounded-full mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : breakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {breakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-400">
                <p className="text-sm">No active certificates found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tier 3: Auditable Ledger */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-gray-700">Auditable Ledger</h3>
            <span className="text-xs text-gray-500 font-medium">
              {searchQuery.trim() ? `Showing ${sortedData.length} of ${sectorData.length} sectors` : "Click a row to deep-dive"}
            </span>
          </div>
          <div className="relative w-full sm:w-72">
            <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter table by barangay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-shadow"
            />
          </div>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
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
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No barangays found matching "<span className="font-semibold text-gray-900">{searchQuery}</span>"
                  </td>
                </tr>
              ) : (
                sortedData.map((sector, index) => {
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
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isSelected ? 'text-blue-700' : (isUnassigned ? 'text-yellow-800' : 'text-gray-900')}`}>
                          {sector.barangay}
                        </span>
                        {isUnassigned && (
                          <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-yellow-200">
                            REVIEW
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-700 font-medium">{sector.resident_count}</td>
                    <td className="px-6 py-3 text-gray-700 font-medium">{sector.certificates_issued}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 font-medium text-sm">{sector.avg_completion_rate}%</span>
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden shrink-0">
                          <div 
                            className={`h-full rounded-full ${isSelected ? 'bg-blue-600' : 'bg-blue-500'}`}
                            style={{ width: `${sector.avg_completion_rate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-700 font-medium">{sector.active_admins}</td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

  );
}
