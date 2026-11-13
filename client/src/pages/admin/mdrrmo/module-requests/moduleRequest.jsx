
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal.jsx";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  HelpSquareIcon,
  Clock01Icon,
  UserCircleIcon,
  Book02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { decodeHtml } from "../../../../utils/textUtils";

const TAB_COPY = {
  pending: {
    title: "Pending Requests",
    subtitle: "Requests waiting for admin approval",
    badge: "Pending",
    emptyTitle: "No Pending Requests",
    emptyText: "There are currently no users requesting enrollment codes. New requests will appear here.",
  },
  approved: {
    title: "Accepted Requests",
    subtitle: "Requests already approved by an admin",
    badge: "Accepted",
    emptyTitle: "No Accepted Requests",
    emptyText: "No enrollment requests have been accepted yet.",
  },
  rejected: {
    title: "Declined Requests",
    subtitle: "Requests an admin declined",
    badge: "Declined",
    emptyTitle: "No Declined Requests",
    emptyText: "No enrollment requests have been declined.",
  },
};

const TABS = [
  { key: "pending", label: "Pending", activeClass: "bg-red-600 text-white" },
  { key: "approved", label: "Accepted", activeClass: "bg-emerald-600 text-white" },
  { key: "rejected", label: "Declined", activeClass: "bg-gray-700 text-white dark:bg-slate-600" },
];

// The server accepts up to 100 IDs per bulk call
const BULK_CHUNK = 100;

function normalizeRequest(req) {
  return {
    id: req.request_id || req.id,
    status: req.status,
    moduleName: req.module_title || req.moduleName || "Untitled Module",
    userName: req.user_name || req.userName || "Unknown Resident",
    userEmail: req.user_email || req.email || "No email",
    requestedAt: req.requested_at || req.createdAt || Date.now(),
  };
}

function StatusBadge({ status }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5" />
        Accepted
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200/50 dark:border-slate-700">
        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
        Declined
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50">
      Pending
    </span>
  );
}

function RowActions({ request, busy, isProcessing, onAccept, onDecline, fullWidth = false }) {
  const size = fullWidth ? "flex-1 sm:flex-none justify-center" : "";
  return (
    <div className={`flex gap-2 ${fullWidth ? "w-full sm:w-auto sm:justify-end" : "justify-end"}`}>
      <button
        type="button"
        onClick={() => onDecline(request)}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer ${size}`}
      >
        <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
        <span>Decline</span>
      </button>
      <button
        type="button"
        onClick={() => onAccept(request)}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer ${size}`}
      >
        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" />
        <span>{isProcessing ? "Approving..." : "Accept"}</span>
      </button>
    </div>
  );
}

function SelectBox({ checked, onChange, label, indeterminate = false }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      onChange={onChange}
      aria-label={label}
      className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-red-600 focus:ring-red-500 cursor-pointer"
    />
  );
}

export default function MdrrmoModuleRequests() {
  useDocumentTitle("Module Requests | MDRRMO Admin");

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [processingId, setProcessingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDecision, setBulkDecision] = useState(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const {
    data: responseData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["adminModuleRequests", activeTab],
    queryFn: async () => {
      const res = await apiClient.get(
        `/admin/module-requests?status=${activeTab}`
      );
      return res.data;
    },
  });

  const requests = (
    Array.isArray(responseData)
      ? responseData
      : responseData?.requests || responseData?.data || []
  ).map(normalizeRequest);

  const isPendingTab = activeTab === "pending";
  const copy = TAB_COPY[activeTab];
  const busy = Boolean(processingId) || isBulkProcessing;

  // Only rows still in the list count, so a refetch can't leave hidden rows selected
  const selected = requests.filter((r) => selectedIds.has(r.id));
  const allSelected = requests.length > 0 && selected.length === requests.length;
  // With nothing ticked, the bulk buttons act on the whole pending list
  const bulkTargets = selected.length > 0 ? selected : requests;

  const refreshRequests = () =>
    queryClient.invalidateQueries({ queryKey: ["adminModuleRequests"] });

  const switchTab = (key) => {
    setActiveTab(key);
    setSelectedIds(new Set());
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(requests.map((r) => r.id)));
  };

  const handleAcceptRequest = async (request) => {
    if (busy) return;

    try {
      setProcessingId(request.id);

      const res = await apiClient.post(
        `/admin/module-requests/${request.id}/approve`
      );

      const assignedCode = res.data?.code;
      toast.success(
        `Request approved! ${
          assignedCode
            ? `Enrollment code (${assignedCode}) sent`
            : "Code sent"
        } to user for "${decodeHtml(request.moduleName)}".`
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve module request.");
    } finally {
      // Refresh either way: a 409 means another admin already handled it
      await refreshRequests();
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (request) => {
    if (busy) return;

    try {
      setProcessingId(request.id);
      await apiClient.post(`/admin/module-requests/${request.id}/reject`);
      toast.success(`Request for "${decodeHtml(request.moduleName)}" declined.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to decline module request.");
    } finally {
      await refreshRequests();
      setProcessingId(null);
    }
  };

  const runBulkDecision = async () => {
    const decision = bulkDecision;
    const ids = bulkTargets.map((r) => r.id);
    setBulkDecision(null);
    if (!decision || ids.length === 0) return;

    setIsBulkProcessing(true);
    let decided = 0;
    let skipped = 0;
    try {
      for (let i = 0; i < ids.length; i += BULK_CHUNK) {
        const res = await apiClient.post("/admin/module-requests/bulk-decide", {
          requestIds: ids.slice(i, i + BULK_CHUNK),
          decision,
        });
        decided += res.data?.decided?.length || 0;
        skipped += res.data?.skipped || 0;
      }
      const verb = decision === "approved" ? "Accepted" : "Declined";
      toast.success(
        `${verb} ${decided} request${decided === 1 ? "" : "s"}.${
          skipped ? ` ${skipped} had already been handled.` : ""
        }`
      );
    } catch (err) {
      const handled = decided ? ` ${decided} were updated before the error.` : "";
      toast.error(`${err?.response?.data?.message || "Bulk update failed."}${handled}`);
    } finally {
      setSelectedIds(new Set());
      await refreshRequests();
      setIsBulkProcessing(false);
    }
  };

  const scopeLabel = selected.length > 0 ? "selected" : "all";

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Module Enrollment Requests
        </h1>
        <p className="mt-1 text-sm font-medium text-gray-500 dark:text-slate-400">
          Review user requests for module enrollment codes and view previously
          accepted requests.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                <HugeiconsIcon icon={HelpSquareIcon} className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
                  {copy.title}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {copy.subtitle}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:flex sm:items-center gap-2" role="group" aria-label="Request status">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => switchTab(tab.key)}
                  aria-pressed={activeTab === tab.key}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === tab.key
                      ? tab.activeClass
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <span
              className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                isPendingTab
                  ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {requests.length} {copy.badge}
            </span>
          </div>

          {isPendingTab && !isLoading && requests.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 p-3">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-gray-700 dark:text-slate-200 cursor-pointer">
                <SelectBox
                  checked={allSelected}
                  indeterminate={selected.length > 0 && !allSelected}
                  onChange={toggleAll}
                  label="Select all pending requests"
                />
                {selected.length > 0
                  ? `${selected.length} of ${requests.length} selected`
                  : "Select all"}
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBulkDecision("rejected")}
                  disabled={busy}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                  <span>
                    Decline<span className="hidden sm:inline"> {scopeLabel}</span> ({bulkTargets.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkDecision("approved")}
                  disabled={busy}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isBulkProcessing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" />
                  )}
                  <span>
                    Accept<span className="hidden sm:inline"> {scopeLabel}</span> ({bulkTargets.length})
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Loading requests...
            </p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {error?.response?.data?.message ||
                error?.message ||
                "Failed to load module requests."}
            </p>
          </div>
        ) : requests.length > 0 ? (
          <>
            {/* Cards below xl: next to the sidebar the content area is too narrow for the table */}
            <ul className="xl:hidden divide-y divide-gray-100 dark:divide-slate-800">
              {requests.map((req) => (
                <li key={req.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {isPendingTab && (
                      <div className="pt-0.5">
                        <SelectBox
                          checked={selectedIds.has(req.id)}
                          onChange={() => toggleOne(req.id)}
                          label={`Select request from ${req.userName}`}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {req.userName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                            {req.userEmail}
                          </p>
                        </div>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
                        <HugeiconsIcon icon={Book02Icon} className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                        <span className="min-w-0 break-words">{decodeHtml(req.moduleName)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400">
                        <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5" />
                        <span>{new Date(req.requestedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {isPendingTab && (
                    <RowActions
                      request={req}
                      busy={busy}
                      isProcessing={processingId === req.id}
                      onAccept={handleAcceptRequest}
                      onDecline={handleRejectRequest}
                      fullWidth
                    />
                  )}
                </li>
              ))}
            </ul>

            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                    {isPendingTab && (
                      <th className="py-3.5 pl-6 pr-2 w-10">
                        <SelectBox
                          checked={allSelected}
                          indeterminate={selected.length > 0 && !allSelected}
                          onChange={toggleAll}
                          label="Select all pending requests"
                        />
                      </th>
                    )}
                    <th className="py-3.5 px-4 lg:px-6">Resident / User</th>
                    <th className="py-3.5 px-4 lg:px-6">Requested Module</th>
                    <th className="py-3.5 px-4 lg:px-6">Status</th>
                    {isPendingTab && (
                      <th className="py-3.5 px-4 lg:px-6 text-right">Actions</th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                  {requests.map((req) => (
                    <tr
                      key={req.id}
                      className={`transition-colors ${
                        selectedIds.has(req.id)
                          ? "bg-red-50/40 dark:bg-red-950/20"
                          : "hover:bg-gray-50/50 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      {isPendingTab && (
                        <td className="py-4 pl-6 pr-2">
                          <SelectBox
                            checked={selectedIds.has(req.id)}
                            onChange={() => toggleOne(req.id)}
                            label={`Select request from ${req.userName}`}
                          />
                        </td>
                      )}
                      <td className="py-4 px-4 lg:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 rounded-full bg-gray-100 dark:bg-slate-800 items-center justify-center text-gray-600 dark:text-slate-300 font-bold shrink-0">
                            <HugeiconsIcon icon={UserCircleIcon} className="w-5 h-5" />
                          </div>

                          <div className="min-w-0 max-w-[16rem]">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {req.userName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                              {req.userEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 lg:px-6">
                        <div className="flex items-center gap-2.5">
                          <HugeiconsIcon icon={Book02Icon} className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                          <span className="font-semibold text-gray-800 dark:text-slate-200">
                            {decodeHtml(req.moduleName)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400">
                          <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5 shrink-0" />
                          <span>{new Date(req.requestedAt).toLocaleString()}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 lg:px-6">
                        <StatusBadge status={req.status} />
                      </td>

                      {isPendingTab && (
                        <td className="py-4 px-4 lg:px-6 whitespace-nowrap">
                          <RowActions
                            request={req}
                            busy={busy}
                            isProcessing={processingId === req.id}
                            onAccept={handleAcceptRequest}
                            onDecline={handleRejectRequest}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-12 sm:p-16 text-center">
            <HugeiconsIcon
              icon={HelpSquareIcon}
              className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-3"
            />
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              {copy.emptyTitle}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs mx-auto">
              {copy.emptyText}
            </p>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={Boolean(bulkDecision)}
        onClose={() => setBulkDecision(null)}
        onConfirm={runBulkDecision}
        title={bulkDecision === "approved" ? "Accept requests?" : "Decline requests?"}
        description={
          bulkDecision === "approved"
            ? `Accept ${bulkTargets.length} request${bulkTargets.length === 1 ? "" : "s"}? Each learner is sent the module's enrollment code.`
            : `Decline ${bulkTargets.length} request${bulkTargets.length === 1 ? "" : "s"}? Each learner is notified and can request again.`
        }
        confirmText={bulkDecision === "approved" ? "Yes, accept" : "Yes, decline"}
        cancelText="Cancel"
        type={bulkDecision === "approved" ? "primary" : "danger"}
      />
    </div>
  );
}
