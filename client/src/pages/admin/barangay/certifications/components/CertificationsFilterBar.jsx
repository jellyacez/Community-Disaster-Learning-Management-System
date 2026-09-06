import SearchBar from "../../../../../components/ui/inputs/SearchBar";

export default function CertificationsFilterBar({
  searchInput,
  onSearchChange,
  onClearSearch,
  modulesList = [],
  selectedModule = "",
  onModuleChange,
  selectedStatus = "",
  onStatusChange,
  onResetFilters,
}) {
  const hasActiveFilters = Boolean(searchInput || selectedModule || selectedStatus);

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      {/* Reusable SearchBar Component */}
      <SearchBar
        value={searchInput}
        onChange={(e) => onSearchChange(e.target.value)}
        onClear={onClearSearch}
        placeholder="Search by resident name, email, cert #, or module..."
        ariaLabel="Search certifications"
        containerClassName="relative flex-1"
      />

      {/* Dropdown Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Module Filter */}
        <div className="relative min-w-[200px]">
          <select
            value={selectedModule}
            onChange={(e) => onModuleChange(e.target.value)}
            className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
          >
            <option value="">All Training Modules</option>
            {[...modulesList]
              .sort((a, b) => (a.modname || "").localeCompare(b.modname || ""))
              .map((m) => (
                <option key={m.mod_id} value={m.mod_id}>
                  {m.modname}
                </option>
              ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="relative min-w-[160px]">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
}
