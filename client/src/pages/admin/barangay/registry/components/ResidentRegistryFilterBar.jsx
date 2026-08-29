import SearchBar from "../../../../../components/ui/inputs/SearchBar";

export default function ResidentRegistryFilterBar({
  searchInput,
  onSearchChange,
  onClearSearch,
  selectedStatus,
  onStatusChange,
}) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      {/* Reusable SearchBar Component */}
      <SearchBar
        value={searchInput}
        onChange={(e) => onSearchChange(e.target.value)}
        onClear={onClearSearch}
        placeholder="Search by resident name or email..."
        ariaLabel="Search residents"
        containerClassName="relative flex-1"
      />

      {/* Dropdown Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <div className="relative min-w-[160px]">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
    </div>
  );
}
