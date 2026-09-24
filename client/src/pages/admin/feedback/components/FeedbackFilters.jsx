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
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <h2 className="text-xl font-black text-gray-900 dark:text-slate-100">
          Incoming Communication Queue
        </h2>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Search + Sort controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500"
          />
          <input
            type="text"
            placeholder="Search by subject, resident name, or type..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Sort:</span>
          <select
            value={sortOrder}
            onChange={handleSortChange}
            className="px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 dark:bg-slate-800 font-medium text-gray-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="status">By Status (Pending → Replied → Closed)</option>
          </select>
        </div>
      </div>
    </>
  );
}
