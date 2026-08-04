import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import apiClient from "../../../../lib/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon, ArrowDown01Icon, Search01Icon, StarAward01Icon, Alert01Icon, UserGroupIcon, Home01Icon, Medal01Icon, Medal02Icon, Medal03Icon } from "@hugeicons/core-free-icons";
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
  Legend,
  Label
} from "recharts";

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

const getCategoryColor = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes('fire')) return '#EF4444'; // Red
  if (lower.includes('flood')) return '#3B82F6'; // Blue
  if (lower.includes('earthquake')) return '#F59E0B'; // Amber
  return '#9CA3AF'; // Gray for General/Other
};

export default function SectorOverview() {
  useDocumentTitle("Sector Overview | Admin Console");

  const [sortConfig, setSortConfig] = useState({ key: 'barangay', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minResidents: '',
    minCompletion: '',
    maxCompletion: '',
    status: 'All'
  });
  const [selectedBarangayId, setSelectedBarangayId] = useState(null);

  const activeFiltersCount = 
    (filters.minResidents !== '' ? 1 : 0) + 
    (filters.minCompletion !== '' ? 1 : 0) + 
    (filters.maxCompletion !== '' ? 1 : 0) + 
    (filters.status !== 'All' ? 1 : 0);

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

  const getLeaderboardColor = (rate) => {
    if (rate >= 80) return "bg-emerald-500";
    if (rate >= 50) return "bg-blue-500";
    if (rate >= 20) return "bg-amber-500";
    return "bg-red-500";
  };

  const sortedData = useMemo(() => {
    let filteredData = sectorData;
    
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

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' 
      ? <HugeiconsIcon icon={ArrowUp01Icon} className="w-3 h-3 ml-1 inline text-blue-600" />
      : <HugeiconsIcon icon={ArrowDown01Icon} className="w-3 h-3 ml-1 inline text-blue-600" />;
  };

  const insights = useMemo(() => {
    if (!kpiData || !top5 || !bottom5) return [];
    const list = [];
    
    if (kpiData.belowThreshold > 0) {
      list.push({
        type: 'warning',
        badge: 'ACTION REQUIRED',
        title: `${kpiData.belowThreshold} Barangays at 0% Completion`,
        text: 'Targeted outreach is recommended for inactive sectors.',
        icon: Alert01Icon,
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        iconBg: 'bg-amber-100',
        filterable: true,
        onClick: () => {
          setSearchQuery("");
          setFilters({ minResidents: '', minCompletion: '', maxCompletion: '0', status: 'All' });
          setTimeout(() => document.getElementById('auditable-ledger')?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      });
    }

    if (top5.length > 0 && top5[0].avg_completion_rate >= 50) {
      list.push({
        type: 'success',
        badge: 'TOP PERFORMER',
        title: `${top5[0].barangay} leads with ${top5[0].avg_completion_rate}% completion`,
        text: 'Consider them for pilot programs.',
        icon: StarAward01Icon,
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-100',
        filterable: true,
        onClick: () => {
          setSearchQuery(top5[0].barangay);
          setFilters({ minResidents: '', minCompletion: '', maxCompletion: '', status: 'All' });
          setTimeout(() => document.getElementById('auditable-ledger')?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      });
    }

    const noResidents = sectorData.filter(b => b.resident_count === 0 && b.barangay !== 'Unassigned').length;
    if (noResidents > 0) {
      list.push({
        type: 'info',
        badge: 'COVERAGE GAP',
        title: `${noResidents} Barangays Unregistered`,
        text: 'No residents have registered on the platform yet.',
        icon: UserGroupIcon,
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
        filterable: true,
        onClick: () => {
          setSearchQuery("");
          setFilters({ minResidents: '', minCompletion: '', maxCompletion: '', status: 'Zero Coverage' });
          setTimeout(() => document.getElementById('auditable-ledger')?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      });
    }

    return list;
  }, [kpiData, top5, bottom5, sectorData]);

  const lastUpdated = dataUpdatedAt ? new Intl.DateTimeFormat('en-US', { 
    month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'
  }).format(new Date(dataUpdatedAt)) : 'Just now';

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
      {/* Breadcrumbs & Header */}
      <div className="mb-8">
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">Dashboard</li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span>Audited Sector Data</span>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span className="text-gray-900 font-semibold">Sector Overview</span>
              </div>
            </li>
          </ol>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Sector Overview</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">Total Residents Across All Barangays: <span className="text-gray-900 font-bold tabular-nums">{totalResidents}</span></p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Data • Last updated: {lastUpdated}
          </div>
        </div>
      </div>

      {/* Insights Panel */}
      {insights.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, idx) => (
            <div 
              key={idx} 
              onClick={insight.onClick}
              className={`p-5 rounded-2xl border ${insight.bg} ${insight.border} flex flex-col justify-between transition-all duration-200 ${insight.filterable ? 'cursor-pointer hover:scale-[1.01] hover:shadow-md' : ''}`}
            >
              <div>
                {/* Badge and Icon */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${insight.iconBg} ${insight.color}`}>
                    <HugeiconsIcon icon={insight.icon} className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-extrabold tracking-widest uppercase ${insight.color}`}>
                    {insight.badge}
                  </span>
                </div>
                
                {/* Content */}
                <h3 className="text-gray-900 font-bold text-base leading-tight mb-1.5">
                  {insight.title}
                </h3>
                <p className="text-xs font-medium text-gray-600/80 leading-relaxed">
                  {insight.text}
                </p>
              </div>

              {/* Action Link */}
              {insight.filterable && (
                <div className={`mt-4 pt-4 border-t ${insight.border} text-xs font-extrabold ${insight.color} flex items-center gap-1 group`}>
                  Filter Table 
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tier 1: KPI Banner */}
      {kpiData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={StarAward01Icon}
            label="Top Completion Rate"
            value={kpiData.mostActiveRate}
            suffix="%"
            sub={`${kpiData.mostActiveName} — Highest performing barangay`}
            color="green"
            isNumeric={true}
            loading={isLoading}
          />
          <StatCard
            icon={Alert01Icon}
            label="Below Threshold"
            value={kpiData.belowThreshold}
            sub="Sectors with 0% completion"
            color="red"
            trend={trends?.belowThreshold}
            loading={isLoading}
          />
          <StatCard
            icon={UserGroupIcon}
            label="Certified Responders"
            value={kpiData.totalCertified}
            sub="Residents with active certs"
            color="blue"
            trend={trends?.certifiedResponders}
            loading={isLoading}
          />
          <StatCard
            icon={Home01Icon}
            label="Barangays Covered"
            value={kpiData.coveredBarangays + " / 21"}
            sub="Sectors with registered users"
            color="purple"
            isNumeric={false}
            trend={trends?.coveredBarangays}
            loading={isLoading}
          />
        </div>
      )}

      {/* Tier 2: Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Leaderboard */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Preparedness Leaderboard</h2>
          <p className="text-sm text-gray-500 mb-6">Top performing barangays and those needing attention.</p>
          
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Top 5 Section */}
            {top5.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Top Performing</h3>
                <div className="flex flex-col gap-2">
                  {top5.map((item, idx) => {
                    const isSelected = selectedBarangayId === item.id;
                    const medal = idx === 0 ? <HugeiconsIcon icon={Medal01Icon} className="w-6 h-6 mx-auto text-amber-500 stroke-[2.5]" /> : 
                                  idx === 1 ? <HugeiconsIcon icon={Medal02Icon} className="w-6 h-6 mx-auto text-gray-400 stroke-[2.5]" /> : 
                                  idx === 2 ? <HugeiconsIcon icon={Medal03Icon} className="w-6 h-6 mx-auto text-amber-700 stroke-[2.5]" /> : 
                                  `${idx + 1}.`;
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => handleRowClick(item.id)}
                        className={`flex items-center gap-3 cursor-pointer p-2 -mx-2 rounded-xl transition-all ${isSelected ? 'bg-blue-50/50 ring-1 ring-blue-100' : 'hover:bg-gray-50'}`}
                      >
                        <div className="w-6 text-center text-sm font-bold text-gray-500 shrink-0">
                          {medal}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-semibold truncate block mb-1 ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                            {item.barangay}
                          </span>
                          <div className="h-6 w-full bg-[#E5E7EB] rounded-md relative flex items-center overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${isSelected ? 'bg-blue-600' : getLeaderboardColor(item.avg_completion_rate)}`}
                              style={{ width: `${item.avg_completion_rate}%` }}
                            />
                            <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                              <span className={`text-[11px] font-black tracking-wide ${item.avg_completion_rate > 15 ? 'text-white drop-shadow-md' : 'text-gray-600'}`}>
                                {item.avg_completion_rate}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom 5 Section */}
            {bottom5.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 mt-4">Needs Attention</h3>
                <div className="flex flex-col gap-2">
                  {bottom5.map((item) => {
                    const isSelected = selectedBarangayId === item.id;
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => handleRowClick(item.id)}
                        className={`flex items-center gap-3 cursor-pointer p-2 -mx-2 rounded-xl transition-all ${isSelected ? 'bg-blue-50/50 ring-1 ring-blue-100' : 'hover:bg-gray-50'}`}
                      >
                        <div className="w-6 shrink-0" /> {/* Spacer for alignment with medals */}
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-semibold truncate block mb-1 ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                            {item.barangay}
                          </span>
                          <div className="h-6 w-full bg-[#E5E7EB] rounded-md relative flex items-center overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${isSelected ? 'bg-blue-600' : getLeaderboardColor(item.avg_completion_rate)}`}
                              style={{ width: `${item.avg_completion_rate}%` }}
                            />
                            <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                              <span className={`text-[11px] font-black tracking-wide ${item.avg_completion_rate > 15 ? 'text-white drop-shadow-md' : 'text-gray-600'}`}>
                                {item.avg_completion_rate}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Category Deep-Dive */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Category Breakdown</h2>
              <p className="text-sm text-gray-500">Certificates issued for <span className="font-semibold text-gray-900">{selectedBarangayName}</span></p>
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
                      <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                    ))}
                    <Label 
                      value={breakdownData.reduce((acc, curr) => acc + curr.value, 0)} 
                      position="center" 
                      className="text-4xl font-black fill-gray-900 drop-shadow-sm" 
                    />
                    <Label 
                      value="Total Certificates" 
                      position="center" 
                      dy={24} 
                      className="text-[10px] font-bold uppercase tracking-wider fill-gray-500" 
                    />
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value, name, props) => {
                      const total = breakdownData.reduce((acc, curr) => acc + curr.value, 0);
                      const percent = ((value / total) * 100).toFixed(1);
                      return [`${value} (${percent}%)`, name];
                    }}
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
                    <td className="px-6 py-3 border-b border-gray-50 text-gray-700 font-medium tabular-nums">{sector.resident_count}</td>
                    <td className="px-6 py-3 border-b border-gray-50 text-gray-700 font-medium tabular-nums">{sector.certificates_issued}</td>
                    <td className="px-6 py-3 border-b border-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 font-medium text-sm tabular-nums min-w-[36px]">{sector.avg_completion_rate}%</span>
                        <div className="w-24 h-2 bg-[#E5E7EB] rounded-full overflow-hidden shrink-0 shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isSelected ? 'bg-blue-600' : getLeaderboardColor(sector.avg_completion_rate)}`}
                            style={{ width: `${sector.avg_completion_rate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 border-b border-gray-50 text-gray-700 font-medium tabular-nums">{sector.active_admins}</td>
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
