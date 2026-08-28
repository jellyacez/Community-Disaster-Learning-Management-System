import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { authClient } from "../../../../../lib/auth-client";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import StatusBadge from "../../../../../components/ui/StatusBadge";
import { SkeletonTableRow } from "../../../../../components/ui/Skeleton";

export default function ActiveModulesTable({ modules = [], isLoading, selectedCategory, statusFilter, onApprove, onReject }) {
  const { data: session } = authClient.useSession();
  const isHeadAdmin = session?.user?.role === "head_mdrrmo_admin";

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  let filtered = modules;
  if (selectedCategory) {
    filtered = filtered.filter(m => m.category === selectedCategory);
  }
  if (statusFilter) {
    filtered = filtered.filter(m => m.status === statusFilter);
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedModules = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'published': return <StatusBadge color="emerald">Published</StatusBadge>;
      case 'pending_review': return <StatusBadge color="amber" className="animate-pulse">Pending Review</StatusBadge>;
      case 'rejected': return <StatusBadge color="red">Rejected</StatusBadge>;
      default: return <StatusBadge color="gray">Draft</StatusBadge>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] h-full min-h-[360px] flex flex-col transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            {statusFilter === 'pending_review' ? 'Pending Approvals' : 'Active Modules'}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {statusFilter === 'pending_review' ? 'Modules awaiting administrative review' : 'Published curriculum & syllabus management'}
          </p>
        </div>
        {selectedCategory && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
            {selectedCategory}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between overflow-x-auto min-h-0">
        {!isLoading && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm py-12">
            <p>No modules found matching the criteria.</p>
          </div>
        ) : (
          <div className="flex flex-col justify-between h-full">
            <div className="flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    <th className="py-2.5 px-4 sm:px-5">Module Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-4 sm:px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {isLoading
                    ? [1, 2, 3, 4, 5].map((i) => (
                        <SkeletonTableRow key={i} columns={4} padding="py-3 px-4 sm:px-5" />
                      ))
                    : paginatedModules.map((mod) => (
                        <tr key={mod.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-2.5 px-4 sm:px-5 max-w-[180px] sm:max-w-[220px]">
                            <Link 
                              to={`/admin/mdrrmo/modules/${mod.id}/details`}
                              className="font-semibold text-gray-900 hover:text-red-600 truncate block transition-colors text-xs"
                              title={mod.title}
                            >
                              {mod.title}
                            </Link>
                            <p className="text-[11px] text-gray-400 mt-0.5">{mod.step_count} Steps</p>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-xs font-medium text-gray-600">{mod.category}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {getStatusBadge(mod.status)}
                          </td>
                          <td className="py-2.5 px-4 sm:px-5 text-right whitespace-nowrap">
                            {isHeadAdmin && mod.status === 'pending_review' ? (
                              <Link 
                                to="/admin/mdrrmo/approvals"
                                className="inline-flex items-center justify-center px-2.5 py-1 bg-red-600 text-white text-[11px] font-bold uppercase rounded-lg hover:bg-red-700 transition-colors shadow-2xs"
                              >
                                Review
                              </Link>
                            ) : (
                              <Link 
                                to={`/admin/mdrrmo/modules/${mod.id}/details`}
                                className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 rounded-lg transition-colors"
                              >
                                Manage
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-100 shrink-0 bg-white">
                <span className="text-[11px] font-medium text-gray-500">
                  Showing <span className="font-semibold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-semibold text-gray-800">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{" "}
                  <span className="font-semibold text-gray-800">{filtered.length}</span> entries
                </span>
                
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-semibold text-gray-700 px-1 text-center">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
