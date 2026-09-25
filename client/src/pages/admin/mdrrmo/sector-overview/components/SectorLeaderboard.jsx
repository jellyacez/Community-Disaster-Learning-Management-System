import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Medal01Icon, Medal02Icon, Medal03Icon } from "@hugeicons/core-free-icons";
import { getLeaderboardColor } from "../utils";
import { SkeletonLeaderboardRow } from "../../../../../components/ui/Skeleton";

export default function SectorLeaderboard({ top5 = [], bottom5 = [], selectedBarangayId, handleRowClick, isLoading }) {
  const [activeTab, setActiveTab] = useState("top");
  const list = activeTab === "top" ? top5 : bottom5;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm flex flex-col h-full min-h-[380px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Preparedness Leaderboard</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {activeTab === "top" ? "Top performing sectors by completion rate." : "Sectors needing attention or intervention."}
          </p>
        </div>

        {/* Segmented Toggle */}
        <div className="flex items-center p-1 bg-gray-100 dark:bg-slate-800 rounded-xl shrink-0 self-start sm:self-auto border border-gray-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveTab("top")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "top"
                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Top Performing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("needs_attention")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "needs_attention"
                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Needs Attention
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-3 py-1 flex-1 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonLeaderboardRow key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-6 text-xs text-gray-400 dark:text-slate-500">
          No barangay data available for this category.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1.5 space-y-1.5">
          {list.map((item, idx) => {
            const isSelected = selectedBarangayId === item.id;
            const badge = activeTab === "top" ? (
              idx === 0 ? <HugeiconsIcon icon={Medal01Icon} className="w-6 h-6 mx-auto text-amber-500 stroke-[2.5]" /> : 
              idx === 1 ? <HugeiconsIcon icon={Medal02Icon} className="w-6 h-6 mx-auto text-gray-400 stroke-[2.5]" /> : 
              idx === 2 ? <HugeiconsIcon icon={Medal03Icon} className="w-6 h-6 mx-auto text-amber-700 stroke-[2.5]" /> : 
              (
                <div className="w-6 h-6 mx-auto rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700 flex items-center justify-center text-[11px] font-bold text-gray-500 dark:text-slate-400 shadow-2xs">
                  {idx + 1}
                </div>
              )
            ) : (
              <div className="w-6 h-6 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 flex items-center justify-center text-[11px] font-bold text-amber-700 dark:text-amber-400 shadow-2xs">
                {idx + 1}
              </div>
            );

            return (
              <div 
                key={item.id} 
                onClick={() => handleRowClick(item.id)}
                className={`flex items-center gap-3 cursor-pointer py-1.5 px-2 -mx-2 rounded-xl transition-all ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-100 dark:ring-blue-900/50' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
              >
                <div className="w-6 text-center text-sm font-bold text-gray-500 shrink-0 flex items-center justify-center">
                  {badge}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-semibold truncate block mb-1 ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                    {item.barangay}
                  </span>
                  <div className="h-6 w-full bg-gray-200 dark:bg-slate-700 border border-gray-300/80 dark:border-slate-500 rounded-md relative flex items-center overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${isSelected ? 'bg-blue-600' : getLeaderboardColor(item.avg_completion_rate)}`}
                      style={{ width: `${item.avg_completion_rate}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                      <span className={`text-[11px] font-black tracking-wide ${item.avg_completion_rate > 15 ? 'text-white drop-shadow-md' : 'text-gray-600 dark:text-slate-300'}`}>
                        {item.avg_completion_rate}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
