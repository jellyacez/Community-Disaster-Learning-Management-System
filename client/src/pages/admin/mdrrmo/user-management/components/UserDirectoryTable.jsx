import { SkeletonTableRow } from "../../../../../components/ui/Skeleton.jsx";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreHorizontalIcon, Archive02Icon, UserBlock01Icon } from "@hugeicons/core-free-icons";
import { useState, useRef, useEffect } from "react";

export default function UserDirectoryTable({ users, isLoading, meta, setPage }) {
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);

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
    <div className="w-full">
      
      <div className="overflow-x-auto min-h-[280px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50">
            <tr className="text-xs text-gray-500 border-b border-gray-200">
              <th className="py-3 px-6 font-semibold uppercase tracking-wider">Personnel</th>
              <th className="py-3 px-6 font-semibold uppercase tracking-wider text-center">Role</th>
              <th className="py-3 px-6 font-semibold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-50">
            {isLoading ? (
              [1, 2, 3].map((i) => <SkeletonTableRow key={i} columns={3} />)
            ) : users.filter(u => u.role !== "Field Responder").length === 0 ? (
              <tr>
                <td colSpan="3" className="py-6 text-center text-gray-400 italic">No administrative users found</td>
              </tr>
            ) : (
              users.filter(u => u.role !== "Field Responder").map((u) => (
                <tr key={u.id || u._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-700">
                          {u.name?.charAt(0).toUpperCase() || "U"}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(openDropdownId === u._id || openDropdownId === u.id ? null : (u._id || u.id));
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <HugeiconsIcon icon={MoreHorizontalIcon} size={18} />
                    </button>
                    
                    {openDropdownId === (u._id || u.id) && (
                      <div 
                        ref={dropdownRef}
                        className="absolute right-8 top-10 w-48 bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-200/50 py-1.5 z-50 text-left animate-in zoom-in-95 duration-100"
                      >
                        <div className="px-3 py-1.5 border-b border-gray-50 mb-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Manage Personnel</p>
                        </div>
                        <button 
                          disabled
                          title="MDRRMO Admins do not have archive permissions."
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
                        >
                          <HugeiconsIcon icon={Archive02Icon} size={16} />
                          <span>Archive Account</span>
                        </button>
                        <button 
                          disabled
                          title="MDRRMO Admins do not have ban permissions."
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
                        >
                          <HugeiconsIcon icon={UserBlock01Icon} size={16} />
                          <span>Ban Personnel</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!isLoading && meta.totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Page {meta.page} of {meta.totalPages} ({meta.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={meta.page === meta.totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
