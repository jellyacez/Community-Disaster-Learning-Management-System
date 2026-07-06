import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { BACOLOR_BARANGAYS } from "../../../../../constants/locations";

export default function UserFilters({
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  barangayFilter,
  setBarangayFilter,
  setPage,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <div className="relative flex-1">
        <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          aria-label="Search users"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <label htmlFor="barangay-filter" className="sr-only">Filter by barangay</label>
        <select
          id="barangay-filter"
          value={barangayFilter}
          aria-label="Filter by barangay"
          onChange={e => { setBarangayFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
        >
          <option value="">All Barangays</option>
          {BACOLOR_BARANGAYS.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <label htmlFor="role-filter" className="sr-only">Filter by role</label>
        <select
          id="role-filter"
          value={roleFilter}
          aria-label="Filter by role"
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
        >
          <option value="">All Roles</option>
          <option value="resident">Resident</option>
          <option value="barangay_admin">Barangay Admin</option>
          <option value="mdrrmo_admin">MDRRMO Admin</option>
          <option value="system_admin">System Admin</option>
        </select>
        <label htmlFor="status-filter" className="sr-only">Filter by status</label>
        <select
          id="status-filter"
          value={statusFilter}
          aria-label="Filter by status"
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
          <option value="archived">Archived</option>
        </select>
      </div>
    </div>
  );
}
