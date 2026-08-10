import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  File01Icon,
  CheckmarkBadge01Icon,
  CancelCircleIcon,
  EyeIcon,
  Clock01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";

export default function AdminModuleApprovals() {
  useDocumentTitle("Module Approvals | Bacolor LMS Admin");
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("pending_review");
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

  const filteredModules = useMemo(() => {
    return approvalRequests.filter(
      (mod) => mod.status.toLowerCase() === activeTab.toLowerCase()
    );
  }, [activeTab, approvalRequests]);

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
        count: approvalRequests.filter((m) => m.status === "rejected").length,
      },
    ],
    [approvalRequests]
  );

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">
          Module Approval Desk
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Review, approve, or reject training modules submitted for publication.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900">
            Review Queue
          </h2>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === tab.key
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400 font-bold">
            Loading approval queue...
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
            <HugeiconsIcon
              icon={File01Icon}
              className="w-12 h-12 text-gray-300 mx-auto mb-3"
            />
            <p className="text-lg font-bold text-gray-800">
              Queue is empty
            </p>
            <p className="text-sm text-gray-500 mt-1">
              There are no modules currently marked as {activeTab}.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredModules.map((moduleItem) => (
              <div
                key={moduleItem.id}
                className="flex flex-col justify-between rounded-3xl border border-gray-100 bg-gray-50/60 p-5 transition-hover hover:border-gray-200"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700 uppercase tracking-wider">
                      {moduleItem.category}
                    </span>
                    <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                      <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5" />
                      {new Date(moduleItem.submitted_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-gray-900 mb-2 leading-tight">
                    {moduleItem.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-4">
                    <HugeiconsIcon icon={UserCircleIcon} className="w-4 h-4 text-gray-400" />
                    <span>Author: {moduleItem.author_name}</span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {moduleItem.description}
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-gray-200/60">
                  <button
                    type="button"
                    // Route this to a read-only viewer for the admin to inspect the content
                    onClick={() => window.open(`/admin/mdrrmo/modules/${moduleItem.id}/details`, "_blank")}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <HugeiconsIcon icon={EyeIcon} className="w-4 h-4" />
                    Preview Content
                  </button>

                  {activeTab === "pending_review" && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedModule(moduleItem)}
                        className="flex items-center justify-center gap-1 w-full px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold transition-colors"
                      >
                        <HugeiconsIcon icon={CancelCircleIcon} className="w-4 h-4" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(moduleItem.id)}
                        disabled={actionMutation.isPending}
                        className="flex items-center justify-center gap-1 w-full px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-bold shadow-sm transition-colors"
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
        )}
      </div>

      {/* REJECTION MODAL */}
      {selectedModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-2xl p-6">
            <h3 className="text-xl font-black text-gray-900">
              Reject Module
            </h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Module: <span className="font-semibold text-gray-800">{selectedModule.title}</span>
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
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
                    rejectError ? "border-red-500 focus:ring-red-500 bg-red-50" : "border-gray-200 focus:ring-emerald-500"
                  }`}
                />
                {rejectError && (
                  <p className="mt-1 text-xs font-bold text-red-500">{rejectError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModule(null);
                    setRejectReason("");
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionMutation.isPending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold text-sm shadow-sm transition-colors"
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
