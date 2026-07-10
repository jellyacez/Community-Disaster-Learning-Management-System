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
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by user name or log text..."
          aria-label="Search logs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
      </div>
      
      <select
        value={roleFilter}
        onChange={(e) => setRoleFilter(e.target.value)}
        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 min-w-[140px]"
      >
        <option value="non_resident">Admins Only (Default)</option>
        <option value="">All Roles</option>
        <option value="system_admin">System Admin</option>
        <option value="mdrrmo_admin">MDRRMO Admin</option>
        <option value="barangay_admin">Barangay Admin</option>
        <option value="resident">Resident</option>
      </select>
      
      <select
        value={actionFilter}
        onChange={(e) => setActionFilter(e.target.value)}
        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 min-w-[160px]"
      >
        <option value="">All Actions</option>
        <option value="auth">Authentication</option>
        <option value="provision">Provisioning</option>
        <option value="role">Roles & Updates</option>
        <option value="ban">Bans & Archiving</option>
        <option value="settings">System Settings</option>
        <option value="security">Security & Infra</option>
      </select>

      <span className="self-center text-xs text-gray-500 font-mono whitespace-nowrap ml-auto">
        {totalEntries.toLocaleString()} total entries
      </span>
      
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-gray-50 text-gray-800 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap"
      >
        <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
        Export Logs
      </button>
    </div>
  );
}
