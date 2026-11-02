import { useState, useRef, useEffect, useId } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreHorizontalIcon,
  Archive02Icon,
  UserBlock01Icon,
} from "@hugeicons/core-free-icons";
import { authClient } from "../../../../../lib/auth-client";
import StatusBadge from "../../../../../components/ui/StatusBadge";
import { SkeletonTableRow } from "../../../../../components/ui/Skeleton";
import AdminTablePagination from "../../../../../components/ui/pagination/AdminTablePagination";

export default function ResidentRegistryTable({
  residents = [],
  meta = { total: 0, page: 1, limit: 10, totalPages: 1 },
  isLoading = false,
  isError = false,
  isActionPending = false,
  page = 1,
  limit = 10,
  onPageChange,
  onLimitChange,
  onOpenActionModal,
}) {
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const currentUser = session?.user;
  const reasonIdPrefix = useId();

  const getActionDisabledReason = (resident, action) => {
    if (isActionPending) return "Another account action is in progress.";
    if (isSessionPending) return "Checking your account permissions…";
    if (!currentUser?.id) return "Sign in to manage resident accounts.";
    const targetId = resident.id || resident._id;
    if (!targetId) return "This account has no valid user ID.";
    if (String(targetId) === String(currentUser.id)) {
      return "You cannot manage your own account here.";
    }
    if (!resident.role) {
      return "Account role unavailable. Its permissions cannot be verified.";
    }
    // Match the resident-only restriction in the barangay ban handler.
    // Never infer a role from a person's barangay membership or display name.
    if (resident.role !== "resident") {
      return "This action is for residents only. Administrator accounts are protected.";
    }
    if (currentUser.role === "barangay_admin") {
      if (!currentUser.barangay_id) return "Your account has no assigned barangay.";
      if (resident.barangay_id != null &&
          String(resident.barangay_id) !== String(currentUser.barangay_id)) {
        return "You can only manage residents in your assigned barangay.";
      }
    }
    if (action === "archive" && resident.archived) return "This resident is already archived.";
    return "";
  };


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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm animate-in fade-in duration-150">
      <div className="overflow-x-auto rounded-t-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50/75 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-6">Resident</th>
              <th className="py-3.5 px-6">Barangay</th>
              <th className="py-3.5 px-6 text-center">Modules Completed</th>
              <th className="py-3.5 px-6 text-center">State</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100 dark:divide-slate-800/60">
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
                <td colSpan="5" className="py-12 text-center text-gray-400 dark:text-slate-500 italic">
                  No resident profiles found matching your search.
                </td>
              </tr>
            ) : (
              residents.map((r) => {
                const residentId = r.id || r._id;
                const isDropdownOpen = openDropdownId === residentId;
                const banAction = r.banned ? "unban" : "ban";
                const banDisabledReason = getActionDisabledReason(r, banAction);
                const archiveDisabledReason = getActionDisabledReason(r, "archive");
                const isArchiveDisabled = Boolean(archiveDisabledReason);
                const archiveReasonId = `${reasonIdPrefix}-archive-${residentId}`;
                const isBanDisabled = Boolean(banDisabledReason);
                const banReasonId = `${reasonIdPrefix}-ban-${residentId}`;

                return (
                  <tr key={residentId} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Resident Info: Avatar + Name + Email subtitle */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center flex-shrink-0 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200/50 dark:border-blue-800/50">
                          {r.name?.charAt(0).toUpperCase() || "R"}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 dark:text-slate-100 leading-tight block">
                            {r.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400 font-normal block mt-0.5">
                            {r.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Barangay */}
                    <td className="py-4 px-6 text-sm font-medium text-gray-600 dark:text-slate-300">
                      {r.barangay || "N/A"}
                    </td>

                    {/* Modules Completed */}
                    <td className="py-4 px-6 text-center font-bold text-gray-900 dark:text-slate-100 text-sm">
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
                        className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        aria-label="Manage resident actions"
                      >
                        <HugeiconsIcon icon={MoreHorizontalIcon} size={18} />
                      </button>

                      {isDropdownOpen && (
                        <div
                          ref={dropdownRef}
                          className="absolute right-6 top-14 w-48 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-lg dark:shadow-black/50 p-1.5 z-50 text-left animate-in zoom-in-95 duration-100"
                        >
                          <div className="px-3 py-1.5 border-b border-gray-50 dark:border-slate-800 mb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">Manage Resident</p>
                          </div>
                          <div title={archiveDisabledReason || "Archive this resident"} className={isArchiveDisabled ? "cursor-not-allowed" : ""}>
                            <button
                              type="button"
                              disabled={isArchiveDisabled}
                              aria-describedby={isArchiveDisabled ? archiveReasonId : undefined}
                              onClick={() => {
                                if (getActionDisabledReason(r, "archive")) return;
                                onOpenActionModal(residentId, "archive");
                                setOpenDropdownId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-200 enabled:hover:bg-gray-50 dark:enabled:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <HugeiconsIcon icon={Archive02Icon} size={16} />
                              <span>Archive Record</span>
                            </button>
                            {isArchiveDisabled && (
                              <p id={archiveReasonId} className="px-3 pb-2 text-xs leading-relaxed text-gray-500 dark:text-slate-400">{archiveDisabledReason}</p>
                            )}
                          </div>

                          <div className="my-1 border-t border-gray-100 dark:border-slate-800" />

                          <div
                            title={banDisabledReason || (r.banned ? "Remove this resident’s ban" : "Ban this resident")}
                            className={isBanDisabled ? "cursor-not-allowed" : ""}
                          >
                            <button
                              type="button"
                              disabled={isBanDisabled}
                              aria-describedby={isBanDisabled ? banReasonId : undefined}
                              onClick={() => {
                                // Check again before opening, including programmatic calls.
                                if (getActionDisabledReason(r, banAction)) return;
                                onOpenActionModal(residentId, banAction);
                                setOpenDropdownId(null);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                                r.banned
                                  ? "text-emerald-700 dark:text-emerald-400 enabled:hover:bg-emerald-50 dark:enabled:hover:bg-emerald-950/30"
                                  : "text-red-600 dark:text-red-400 enabled:hover:bg-red-50 dark:enabled:hover:bg-red-950/30"
                              }`}
                            >
                              <HugeiconsIcon icon={UserBlock01Icon} size={16} />
                              <span>{r.banned ? "Unban Resident" : "Ban Resident"}</span>
                            </button>
                            {isBanDisabled && (
                              <p id={banReasonId} className="px-3 pb-2 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                                {banDisabledReason}
                              </p>
                            )}
                          </div>
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
