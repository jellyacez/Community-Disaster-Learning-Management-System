import { HugeiconsIcon } from "@hugeicons/react";
import { Medal01Icon, Medal02Icon, Medal03Icon } from "@hugeicons/core-free-icons";
import { getLeaderboardColor } from "../utils";
import { SkeletonLeaderboardRow } from "../../../../../components/ui/Skeleton";

export default function SectorLeaderboard({ top5 = [], bottom5 = [], selectedBarangayId, handleRowClick, isLoading }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Preparedness Leaderboard</h2>
      <p className="text-sm text-gray-500 mb-6">Top performing barangays and those needing attention.</p>
      
      {isLoading ? (
        <div className="space-y-3 py-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonLeaderboardRow key={i} />
          ))}
        </div>
      ) : (
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
      )}
    </div>
  );
}
