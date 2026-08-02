import { useQuery } from "@tanstack/react-query";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import apiClient from "../../../../lib/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserMultipleIcon, UserShield01Icon, Certificate01Icon, ChartHistogramIcon } from "@hugeicons/core-free-icons";

const fetchSectorOverview = async () => {
  const res = await apiClient.get("/admin/mdrrmo/sector-overview");
  return res.data.data;
};

export default function SectorOverview() {
  useDocumentTitle("Sector Overview | Admin Console");

  const { data: sectorData = [], isLoading, isError } = useQuery({
    queryKey: ["sectorOverview"],
    queryFn: fetchSectorOverview,
    retry: 1
  });

  const totalResidents = sectorData.reduce((acc, curr) => acc + curr.resident_count, 0);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sectorData.map((sector, index) => (
          <div key={index} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            {sector.barangay === 'Unassigned' && (
              <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10">
                NEEDS REVIEW
              </div>
            )}
            
            <h3 className="text-xl font-bold text-gray-900 mb-6 truncate pr-16">{sector.barangay}</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <HugeiconsIcon icon={UserMultipleIcon} className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-gray-600">Residents</span>
                </div>
                <span className="text-lg font-black text-gray-900">{sector.resident_count}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <HugeiconsIcon icon={Certificate01Icon} className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-gray-600">Certificates</span>
                </div>
                <span className="text-lg font-black text-gray-900">{sector.certificates_issued}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                    <HugeiconsIcon icon={ChartHistogramIcon} className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-gray-600">Completion</span>
                </div>
                <span className="text-lg font-black text-gray-900">{sector.avg_completion_rate}%</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                    <HugeiconsIcon icon={UserShield01Icon} className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-gray-600">Active Admins</span>
                </div>
                <span className="text-lg font-black text-gray-900">{sector.active_admins}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
