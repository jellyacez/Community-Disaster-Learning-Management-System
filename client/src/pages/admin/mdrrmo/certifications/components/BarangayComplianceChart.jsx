import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Medal01Icon,
  Medal02Icon,
  Medal03Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { SkeletonLeaderboardRow } from "../../../../../components/ui/Skeleton";

export default function BarangayComplianceChart({ barangays = [], isLoading }) {
  const [activeTab, setActiveTab] = useState("top"); // "top" | "attention" | "all"
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Handle tab change and reset page
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  // Sort descending by compliance rate
  const sorted = [...barangays].sort((a, b) => b.compliance_rate - a.compliance_rate);
  const topPerforming = sorted.filter((b) => b.compliance_rate > 0).slice(0, 5);
  const needsAttentionAll = sorted.slice().reverse();

  // Full dataset for selected tab
  const rawList =
    activeTab === "top"
      ? topPerforming.length > 0 ? topPerforming : sorted.slice(0, 5)
      : activeTab === "attention"
      ? needsAttentionAll
      : sorted;

  // Pagination calculations (Top 5 is fixed and unpaginated)
  const isPaginated = activeTab !== "top" && rawList.length > pageSize;
  const totalPages = Math.ceil(rawList.length / pageSize) || 1;
  const displayList = isPaginated
    ? rawList.slice((page - 1) * pageSize, page * pageSize)
    : rawList;

  const getBarColor = (rate) => {
    if (rate >= 75) return "bg-emerald-500";
    if (rate >= 40) return "bg-blue-500";
    if (rate > 0) return "bg-amber-500";
    return "bg-gray-300";
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-6 flex flex-col h-full min-h-[420px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Barangay Compliance Leaderboard</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Active certified responders vs. total registered residents across all 21 barangays
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => handleTabChange("top")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "top"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Top 5
          </button>
          <button
            onClick={() => handleTabChange("attention")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "attention"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Needs Attention
          </button>
          <button
            onClick={() => handleTabChange("all")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            All 21
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 py-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonLeaderboardRow key={i} />
          ))}
        </div>
      ) : displayList.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          No barangay compliance records available.
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-3 pr-1">
            {displayList.map((item, idx) => {
              const itemGlobalRank =
                activeTab === "top"
                  ? idx
                  : (page - 1) * pageSize + idx;

              const medal =
                activeTab === "top" && itemGlobalRank === 0 ? (
                  <HugeiconsIcon icon={Medal01Icon} className="w-5 h-5 text-amber-500" />
                ) : activeTab === "top" && itemGlobalRank === 1 ? (
                  <HugeiconsIcon icon={Medal02Icon} className="w-5 h-5 text-gray-400" />
                ) : activeTab === "top" && itemGlobalRank === 2 ? (
                  <HugeiconsIcon icon={Medal03Icon} className="w-5 h-5 text-amber-700" />
                ) : (
                  <span className="text-xs font-bold text-gray-400">{itemGlobalRank + 1}.</span>
                );

              return (
                <div
                  key={item.barangay_id}
                  className="p-2.5 rounded-xl bg-gray-50/50 hover:bg-gray-50 border border-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 flex justify-center">{medal}</div>
                      <span className="font-bold text-gray-900 text-sm">
                        {item.barangay_name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-gray-900 text-sm">
                        {item.compliance_rate}%
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium ml-1.5">
                        ({item.active_certified_count} / {item.resident_count} residents)
                      </span>
                    </div>
                  </div>

                  {/* Progress Track */}
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getBarColor(
                        item.compliance_rate
                      )}`}
                      style={{ width: `${Math.min(item.compliance_rate, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls for Needs Attention & All 21 */}
          {isPaginated && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">
                Showing{" "}
                <span className="font-semibold text-gray-900">
                  {(page - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-900">
                  {Math.min(page * pageSize, rawList.length)}
                </span>{" "}
                of <span className="font-semibold text-gray-900">{rawList.length}</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3 h-3" />
                  Prev
                </button>
                <span className="text-xs font-semibold text-gray-600 px-1.5">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                >
                  Next
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
