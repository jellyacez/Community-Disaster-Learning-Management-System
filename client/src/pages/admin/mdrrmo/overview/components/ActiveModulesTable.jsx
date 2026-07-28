import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { authClient } from "../../../../../lib/auth-client";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export default function ActiveModulesTable({ modules = [], selectedCategory, statusFilter, onApprove, onReject }) {
  const { data: session } = authClient.useSession();
  const isHeadAdmin = session?.user?.role === "head_mdrrmo_admin";

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      case 'published': return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold tracking-wide uppercase rounded-full">Published</span>;
      case 'pending_review': return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold tracking-wide uppercase rounded-full animate-pulse">Pending Review</span>;
      case 'rejected': return <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-bold tracking-wide uppercase rounded-full">Rejected</span>;
      default: return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold tracking-wide uppercase rounded-full">Draft</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] h-full min-h-[350px] flex flex-col transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="text-[18px] font-bold text-gray-900">
          {statusFilter === 'pending_review' ? 'Pending Approvals' : 'Active Modules'}
        </h2>
        {selectedCategory && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-50 px-2 py-1 rounded-full">
            {selectedCategory}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between overflow-x-auto min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm py-12">
            <p>No modules found matching the criteria.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Module Name</th>
                    <th className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Category</th>
                    <th className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Status</th>
                    <th className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedModules.map(mod => (
                    <tr key={mod.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-6">
                        <p className="text-[14px] font-semibold text-gray-900 truncate max-w-[200px]">{mod.title}</p>
                        <p className="text-[12px] text-gray-500">{mod.step_count} Steps</p>
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-[13px] font-medium text-gray-600">{mod.category}</span>
                      </td>
                      <td className="py-3 px-6">
                        {getStatusBadge(mod.status)}
                      </td>
                      <td className="py-3 px-6 text-right">
                        {isHeadAdmin && mod.status === 'pending_review' ? (
                          <Link 
                            to={`/admin/mdrrmo/modules/${mod.id}`}
                            className="inline-block px-4 py-1.5 bg-red-600 text-white text-[12px] font-bold tracking-wide uppercase rounded hover:bg-red-700 transition-colors"
                          >
                            Review
                          </Link>
                        ) : (
                          <Link 
                            to={`/admin/mdrrmo/modules/${mod.id}`}
                            className="text-[13px] font-semibold text-red-600 hover:text-red-700 hover:underline"
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
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
                <span className="text-xs font-semibold text-gray-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-gray-700 min-w-[32px] text-center">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
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
