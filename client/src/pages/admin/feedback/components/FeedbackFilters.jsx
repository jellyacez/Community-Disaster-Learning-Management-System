import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

export default function FeedbackFilters({
  tabs,
  activeTab,
  handleTabChange,
  searchQuery,
  handleSearchChange,
  sortOrder,
  handleSortChange,
}) {
  return (
    <div className="w-full max-w-full space-y-3.5 sm:space-y-4 mb-4 sm:mb-5">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-slate-100 tracking-tight shrink-0">
          Incoming Communication Queue
        </h2>

        {/* Scrollable on mobile, wrapped on larger viewports */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 sm:flex-wrap">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`px-3.5 sm:px-4 py-2 min-h-[38px] rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all active:scale-[0.98] cursor-pointer select-none ${
                  isActive
                    ? "bg-red-600 text-white shadow-2xs"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/60"
                }`}
              >
                <span>{tab.label}</span>{" "}
                <span className={isActive ? "text-red-100" : "text-gray-500 dark:text-slate-400"}>
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by subject, resident name, or type..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 min-h-[42px] bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/80 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none transition-all truncate"
          />
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <label className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
            Sort:
          </label>
          <select
            value={sortOrder}
            onChange={handleSortChange}
            className="flex-1 sm:flex-initial sm:w-auto max-w-full px-3 py-2.5 min-h-[42px] bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700/80 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-200 outline-none cursor-pointer transition-all truncate"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="status">By Status (Pending &rarr; Replied &rarr; Closed)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
