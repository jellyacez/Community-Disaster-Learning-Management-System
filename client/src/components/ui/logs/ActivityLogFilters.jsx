import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Download01Icon } from "@hugeicons/core-free-icons";

export default function ActivityLogFilters({
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  actionFilter,
  setActionFilter,
  totalEntries,
  onExport,
  roleOptions,
  actionOptions,
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Search by user name or log text..."
          aria-label="Search logs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-slate-700"
        />
      </div>
      
      <select
        value={roleFilter}
        onChange={(e) => setRoleFilter(e.target.value)}
        className="px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-slate-700 min-w-[140px]"
      >
        {roleOptions.map((opt, i) => (
          <option key={i} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      
      <select
        value={actionFilter}
        onChange={(e) => setActionFilter(e.target.value)}
        className="px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-slate-700 min-w-[160px]"
      >
        {actionOptions.map((opt, i) => (
          <option key={i} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      
      <span className="self-center text-xs text-gray-500 dark:text-slate-400 font-mono whitespace-nowrap ml-auto">
        {totalEntries.toLocaleString()} total entries
      </span>
      
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-xl text-sm font-semibold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer"
      >
        <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
        Export Logs
      </button>
    </div>
  );
}
