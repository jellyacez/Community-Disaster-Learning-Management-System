import { useState, useRef, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreHorizontalIcon,
  Archive02Icon,
  UserBlock01Icon,
} from "@hugeicons/core-free-icons";
import StatusBadge from "../../../../../components/ui/StatusBadge";
import { SkeletonTableRow } from "../../../../../components/ui/Skeleton";
import AdminTablePagination from "../../../../../components/ui/pagination/AdminTablePagination";

export default function ResidentRegistryTable({
  residents = [],
  meta = { total: 0, page: 1, limit: 10, totalPages: 1 },
  isLoading = false,
  isError = false,
  page = 1,
  limit = 10,
  onPageChange,
  onLimitChange,
  onOpenActionModal,
}) {
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm animate-in fade-in duration-150">
      <div className="overflow-x-auto rounded-t-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-6">Resident</th>
              <th className="py-3.5 px-6">Barangay</th>
              <th className="py-3.5 px-6 text-center">Modules Completed</th>
              <th className="py-3.5 px-6 text-center">State</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonTableRow key={i} columns={5} hasAvatar={true} padding="py-4 px-6" />
              ))
            ) : isError ? (
              <tr>
                <td colSpan="5" className="py-12 text-center text-red-500 font-medium">
                  Error loading resident records. Please check your connection and try again.
                </td>
              </tr>
            ) : residents.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-12 text-center text-gray-400 italic">
                  No resident profiles found matching your search.
                </td>
              </tr>
            ) : (
              residents.map((r) => {
                const residentId = r.id || r._id;
                const isDropdownOpen = openDropdownId === residentId;

                return (
                  <tr key={residentId} className="hover:bg-gray-50/60 transition-colors">
                    {/* Resident Info: Avatar + Name + Email subtitle */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 font-bold text-xs">
                          {r.name?.charAt(0).toUpperCase() || "R"}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 leading-tight block">
                            {r.name}
                          </span>
                          <span className="text-xs text-gray-500 font-normal block mt-0.5">
                            {r.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Barangay */}
                    <td className="py-4 px-6 text-sm font-medium text-gray-600">
                      {r.barangay || "N/A"}
                    </td>

                    {/* Modules Completed */}
                    <td className="py-4 px-6 text-center font-bold text-gray-900 text-sm">
                      {r.modulesCompleted ?? 0} {r.modulesCompleted === 1 ? "Module" : "Modules"} Completed
                    </td>

                    {/* Account Standing State */}
                    <td className="py-4 px-6 text-center">
                      {r.banned ? (
                        <StatusBadge color="red">Banned</StatusBadge>
                      ) : r.archived ? (
                        <StatusBadge color="slate">Archived</StatusBadge>
                      ) : (
                        <StatusBadge color="emerald">Active</StatusBadge>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-4 px-6 text-right relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(isDropdownOpen ? null : residentId);
                        }}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                        aria-label="Manage resident actions"
                      >
                        <HugeiconsIcon icon={MoreHorizontalIcon} size={18} />
                      </button>

                      {isDropdownOpen && (
                        <div
                          ref={dropdownRef}
                          className="absolute right-6 top-14 w-48 bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-200/50 p-1.5 z-50 text-left animate-in zoom-in-95 duration-100"
                        >
                          <div className="px-3 py-1.5 border-b border-gray-50 mb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Manage Resident</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onOpenActionModal(residentId, "archive");
                              setOpenDropdownId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <HugeiconsIcon icon={Archive02Icon} size={16} />
                            <span>Archive Record</span>
                          </button>
                          
                          <div className="my-1 border-t border-gray-100" />

                          <button
                            type="button"
                            onClick={() => {
                              onOpenActionModal(residentId, "ban");
                              setOpenDropdownId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <HugeiconsIcon icon={UserBlock01Icon} size={16} />
                            <span>Ban Resident</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Standardized Sticky Pagination Footer */}
      {!isLoading && !isError && (
        <AdminTablePagination
          page={page}
          totalPages={meta.totalPages || 1}
          total={meta.total || 0}
          limit={limit}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
          itemName="residents"
          sticky={true}
          className="rounded-b-2xl"
        />
      )}
    </div>
  );
}
