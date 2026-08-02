import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import apiClient from "../../../../lib/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";

const fetchSectorOverview = async () => {
  const res = await apiClient.get("/admin/mdrrmo/sector-overview");
  return res.data.data;
};

export default function SectorOverview() {
  useDocumentTitle("Sector Overview | Admin Console");

  const [sortConfig, setSortConfig] = useState({ key: 'barangay', direction: 'asc' });

  const { data: sectorData = [], isLoading, isError } = useQuery({
    queryKey: ["sectorOverview"],
    queryFn: fetchSectorOverview,
    retry: 1
  });

  const totalResidents = sectorData.reduce((acc, curr) => acc + curr.resident_count, 0);

  const sortedData = useMemo(() => {
    let sortableData = [...sectorData];
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
  }, [sectorData, sortConfig]);

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

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-150 pb-12 p-6 md:p-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Audited Sector Data</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">Total Residents Across All Barangays: {totalResidents}</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => requestSort('barangay')}
                >
                  Barangay {renderSortIcon('barangay')}
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => requestSort('resident_count')}
                >
                  Residents {renderSortIcon('resident_count')}
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => requestSort('certificates_issued')}
                >
                  Certificates {renderSortIcon('certificates_issued')}
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => requestSort('avg_completion_rate')}
                >
                  <div>
                    Completion Rate {renderSortIcon('avg_completion_rate')}
                    <div className="text-[10px] text-gray-400 font-normal mt-0.5">completed vs. enrolled</div>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => requestSort('active_admins')}
                >
                  Active Admins {renderSortIcon('active_admins')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedData.map((sector, index) => {
                const isUnassigned = sector.barangay === 'Unassigned';
                return (
                  <tr 
                    key={index} 
                    className={`transition-colors ${isUnassigned ? 'bg-yellow-50/30 hover:bg-yellow-50/50' : 'hover:bg-gray-50/50'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isUnassigned ? 'text-yellow-800' : 'text-gray-900'}`}>
                          {sector.barangay}
                        </span>
                        {isUnassigned && (
                          <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-yellow-200">
                            NEEDS REVIEW
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{sector.resident_count}</td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{sector.certificates_issued}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 font-medium">{sector.avg_completion_rate}%</span>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${sector.avg_completion_rate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{sector.active_admins}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
