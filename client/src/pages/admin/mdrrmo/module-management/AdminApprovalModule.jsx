import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  File01Icon,
  CheckmarkBadge01Icon,
  CancelCircleIcon,
  EyeIcon,
  Clock01Icon,
  UserCircleIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";
import { decodeHtml } from "../../../../utils/textUtils";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";
import { SkeletonModuleCard } from "../../../../components/ui/Skeleton";

export default function AdminModuleApprovals() {
  useDocumentTitle("Module Approvals | Bacolor LMS Admin");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("pending_review");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const [selectedModule, setSelectedModule] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, moduleId: null });

  const { data: approvalRequests = [], isLoading } = useQuery({
    queryKey: ["moduleApprovals"],
    queryFn: async () => {
      const response = await apiClient.get("/admin/mdrrmo/approvals");
      return response.data.data || [];
    },
    refetchInterval: 60000, // Poll every 60s for new approval requests
  });

  const actionMutation = useMutation({
      mutationFn: async ({ moduleId, action, remarks }) => {
        // Map frontend 'action' to your backend 'status' enums
        const targetStatus = action === "approve" ? "published" : "rejected";

        const response = await apiClient.put(`/admin/mdrrmo/module/${moduleId}/review`, {
          status: targetStatus,
          rejection_reason: remarks,
        });
        return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === "approve"
          ? "Module approved and published successfully."
          : "Module rejected and returned to author."
      );
      queryClient.invalidateQueries({ queryKey: ["moduleApprovals"] });
      queryClient.invalidateQueries({ queryKey: ["adminModules"] });
      setSelectedModule(null);
      setRejectReason("");
      setRejectError("");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to process the review.");
    },
  });

  const handleApprove = (moduleId) => {
    setConfirmModal({ isOpen: true, moduleId });
  };

  const confirmApproval = () => {
    if (confirmModal.moduleId) {
      actionMutation.mutate({ moduleId: confirmModal.moduleId, action: "approve" });
    }
    setConfirmModal({ isOpen: false, moduleId: null });
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setRejectError("A reason is required to reject a module.");
      return;
    }
    setRejectError("");
    actionMutation.mutate({
      moduleId: selectedModule.id,
      action: "reject",
      remarks: rejectReason,
    });
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setCurrentPage(1);
  };

  const filteredModules = useMemo(() => {
    const list = approvalRequests.filter((mod) => {
      if (activeTab === "rejected") {
        return mod.status === "draft" && mod.rejection_reason;
      }
      return mod.status.toLowerCase() === activeTab.toLowerCase();
    });

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((mod) => {
      const titleMatch = (mod.title || "").toLowerCase().includes(q);
      const authorMatch = (mod.author_name || "").toLowerCase().includes(q);
      const categoryMatch = (mod.category || "").toLowerCase().includes(q);
      return titleMatch || authorMatch || categoryMatch;
    });
  }, [activeTab, approvalRequests, searchQuery]);

  const totalPages = Math.ceil(filteredModules.length / ITEMS_PER_PAGE) || 1;
  const paginatedModules = filteredModules.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);

    requestAnimationFrame(() => {
      try {
        const scrollEl = document.querySelector("main .overflow-y-auto") || document.querySelector("main");
        if (scrollEl) {
          scrollEl.scrollTo({ top: 0, behavior: "smooth" });
        }
        const topEl = document.getElementById("approval-desk-top");
        if (topEl) {
          topEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        window.scrollTo(0, 0);
      }
    });
  };

  const tabs = useMemo(
    () => [
      {
        key: "pending_review",
        label: "Pending Review",
        count: approvalRequests.filter((m) => m.status === "pending_review").length,
      },
      {
        key: "published",
        label: "Approved",
        count: approvalRequests.filter((m) => m.status === "published").length,
      },
      {
        key: "rejected",
        label: "Rejected",
        count: approvalRequests.filter((m) => m.status === "draft" && m.rejection_reason).length,
      },
    ],
    [approvalRequests]
  );

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <div className="mb-8">
        <nav className="flex text-sm text-gray-500 dark:text-slate-400 mb-2" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">Dashboard</li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400 dark:text-slate-500">&gt;</span>
                <span>Curriculum & Content</span>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400 dark:text-slate-500">&gt;</span>
                <span className="text-gray-900 dark:text-slate-100 font-semibold">Approval Desk</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100">
          Module Approval Desk
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          Review, approve, or reject training modules submitted for publication.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
        <div id="approval-desk-top" className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              Review Queue
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Showing {filteredModules.length} module{filteredModules.length === 1 ? "" : "s"} in {tabs.find((t) => t.key === activeTab)?.label}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search title, author..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-shadow"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100 dark:bg-slate-800/80 rounded-2xl border border-gray-200/60 dark:border-slate-700/60">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.key
                      ? "bg-red-600 text-white shadow-xs"
                      : "text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonModuleCard key={i} />
            ))}
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 p-10 text-center">
            <HugeiconsIcon
              icon={File01Icon}
              className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3"
            />
            <p className="text-lg font-bold text-gray-800 dark:text-slate-200">
              {searchQuery ? "No matching modules" : "Queue is empty"}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {searchQuery ? (
                <>
                  No modules match "<span className="font-semibold text-gray-700 dark:text-slate-300">{searchQuery}</span>".
                  <button 
                    type="button"
                    onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                    className="block mx-auto mt-2 text-xs font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Clear Search
                  </button>
                </>
              ) : (
                `There are no modules currently marked as ${tabs.find((t) => t.key === activeTab)?.label.toLowerCase() || activeTab}.`
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedModules.map((moduleItem) => (
                <div
                  key={moduleItem.id}
                  className="flex flex-col justify-between rounded-3xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40 p-5 transition-hover hover:border-gray-200 dark:hover:border-slate-700"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        {moduleItem.category}
                      </span>
                      <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 flex items-center gap-1">
                        <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5" />
                        {new Date(moduleItem.submitted_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 leading-tight">
                      {decodeHtml(moduleItem.title)}
                    </h3>

                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-slate-400 mb-4">
                      <HugeiconsIcon icon={UserCircleIcon} className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                      <span>Author: {moduleItem.author_name || "Unknown"}</span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-3 mb-4">
                      {(moduleItem.description || "").replace(/<[^>]*>?/gm, '')}
                    </p>

                    {activeTab === "rejected" && moduleItem.rejection_reason && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/60 rounded-xl">
                        <p className="text-[11px] font-bold text-red-800 dark:text-red-300 uppercase tracking-wider mb-1">Reason for Rejection</p>
                        <p className="text-xs text-red-600 dark:text-red-400 italic">"{moduleItem.rejection_reason}"</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-4 border-t border-gray-200/60 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/mdrrmo/modules/${moduleItem.id}/details`, { state: { fromApprovalDesk: true } })}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <HugeiconsIcon icon={EyeIcon} className="w-4 h-4" />
                      Preview Content
                    </button>

                    {activeTab === "pending_review" && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setSelectedModule(moduleItem)}
                          className="flex items-center justify-center gap-1 w-full px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 text-sm font-bold transition-colors cursor-pointer"
                        >
                          <HugeiconsIcon icon={CancelCircleIcon} className="w-4 h-4" />
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(moduleItem.id)}
                          disabled={actionMutation.isPending}
                          className="flex items-center justify-center gap-1 w-full px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer"
                        >
                          <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-4 h-4" />
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="min-h-[44px] px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handlePageChange(i + 1)}
                      className={`min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        currentPage === i + 1
                          ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                          : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-2xs"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="min-h-[44px] px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REJECTION MODAL */}
      {selectedModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-xl font-black text-gray-900 dark:text-slate-100">
              Reject Module
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 mb-4">
              Module: <span className="font-semibold text-gray-800 dark:text-slate-200">{decodeHtml(selectedModule.title)}</span>
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Reason for Rejection
                </label>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (e.target.value.trim()) setRejectError("");
                  }}
                  placeholder="Explain what needs to be fixed before approval..."
                  className={`w-full px-4 py-3 border rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 ${
                    rejectError 
                      ? "border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200" 
                      : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-emerald-500"
                  }`}
                />
                {rejectError && (
                  <p className="mt-1 text-xs font-bold text-red-500 dark:text-red-400">{rejectError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModule(null);
                    setRejectReason("");
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-sm cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionMutation.isPending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
                >
                  {actionMutation.isPending ? "Processing..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, moduleId: null })}
        onConfirm={confirmApproval}
        title="Approve Module"
        description="Are you sure you want to approve and publish this module? It will become visible to residents."
        confirmText="Approve & Publish"
        type="success"
      />
    </div>
  );
}
