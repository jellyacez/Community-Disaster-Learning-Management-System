import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  RefreshIcon,
  Cancel01Icon,
  Task01Icon,
  UserIcon,
  Notification01Icon,
  Message01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { localDb } from "../../lib/localDb";
import {
  retryFailedTask,
  discardFailedTask,
  getActionDescription,
  processOfflineQueue,
} from "../../lib/LocalSave/syncManager";
import toast from "react-hot-toast";
import Spinner from "./Spinner";
import ConfirmationModal from "./modals/ConfirmationModal";

export default function UnsyncedQueueIndicator() {
  const [queueItems, setQueueItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [retryingIds, setRetryingIds] = useState(new Set());
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [confirmDiscardTask, setConfirmDiscardTask] = useState(null);
  const [confirmDiscardAllModal, setConfirmDiscardAllModal] = useState(false);

  const loadQueue = async () => {
    try {
      const items = await localDb.sync_queue.toArray();
      setQueueItems(items);
    } catch (err) {
      console.error("Failed to read sync_queue:", err);
    }
  };

  useEffect(() => {
    loadQueue();
    window.addEventListener("offline-sync-queue-updated", loadQueue);
    window.addEventListener("offline-sync-item-success", loadQueue);
    return () => {
      window.removeEventListener("offline-sync-queue-updated", loadQueue);
      window.removeEventListener("offline-sync-item-success", loadQueue);
    };
  }, []);

  const failedItems = queueItems.filter((i) => i.status === "failed");
  const retryingItems = queueItems.filter((i) => i.status === "retrying");
  const pendingItems = queueItems.filter((i) => i.status === "pending");

  if (queueItems.length === 0) return null;

  const handleRetryItem = async (syncId) => {
    if (retryingIds.has(syncId) || isRetryingAll) return;
    setRetryingIds((prev) => new Set(prev).add(syncId));
    toast.loading("Retrying...", { id: `retry-${syncId}` });
    try {
      await retryFailedTask(syncId);
      toast.success("Sync triggered", { id: `retry-${syncId}` });
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(syncId);
        return next;
      });
    }
  };

  const handleRetryAll = async () => {
    if (isRetryingAll || retryingIds.size > 0) return;
    setIsRetryingAll(true);
    toast.loading("Retrying all failed syncs...", { id: "retry-all" });
    try {
      for (const item of failedItems) {
        await localDb.sync_queue.update(item.sync_id, {
          status: "pending",
          retry_count: 0,
          next_retry_at: null,
          last_error: null,
        });
      }
      window.dispatchEvent(new CustomEvent("offline-sync-queue-updated"));
      await processOfflineQueue();
      toast.success("Sync triggered.", { id: "retry-all" });
    } finally {
      setIsRetryingAll(false);
    }
  };

  const executeDiscardItem = async () => {
    if (!confirmDiscardTask) return;
    await discardFailedTask(confirmDiscardTask.sync_id);
    setConfirmDiscardTask(null);
    toast.success("Action discarded.");
  };

  const executeDiscardAll = async () => {
    for (const item of failedItems) {
      await discardFailedTask(item.sync_id);
    }
    setConfirmDiscardAllModal(false);
    toast.success("Discarded all failed actions.");
  };

  const getItemIcon = (actionType) => {
    switch (actionType) {
      case "SUBMIT_FEEDBACK":
      case "REPLY_FEEDBACK":
        return Message01Icon;
      case "UPDATE_NAME":
      case "UPDATE_AVATAR":
        return UserIcon;
      case "UPDATE_NOTIFICATION_SETTINGS":
        return Notification01Icon;
      case "MARK_STEP_COMPLETE":
      case "SUBMIT_QUIZ":
      case "UPDATE_PROGRESS":
      case "COMPLETE_MODULE":
      default:
        return Task01Icon;
    }
  };

  return (
    <>
      {/* Trigger Badge Button (Fitts's Law >=44px) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="View unsynced offline actions"
        className={`min-h-[44px] flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
          failedItems.length > 0
            ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 animate-pulse"
            : retryingItems.length > 0
            ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
        }`}
      >
        <HugeiconsIcon
          icon={failedItems.length > 0 ? AlertCircleIcon : RefreshIcon}
          className={`w-4 h-4 ${retryingItems.length > 0 ? "animate-spin" : ""}`}
        />
        <span>
          {failedItems.length > 0
            ? `${failedItems.length} Sync Failed`
            : `${queueItems.length} Queued`}
        </span>
      </button>

      {/* Slide-Over Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="font-extrabold text-lg text-gray-900 flex items-center gap-2">
                  <HugeiconsIcon icon={RefreshIcon} className="w-5 h-5 text-red-600" />
                  Offline Sync Queue
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {queueItems.length} total queued action{queueItems.length !== 1 ? "s" : ""}
                  {failedItems.length > 0 && ` · ${failedItems.length} require attention`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close offline sync queue modal"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {queueItems.map((task) => {
                const ItemIcon = getItemIcon(task.action_type);
                const isFailed = task.status === "failed";
                const isRetrying = task.status === "retrying";
                const isThisRetrying = retryingIds.has(task.sync_id) || isRetryingAll;

                return (
                  <div
                    key={task.sync_id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isFailed
                        ? "bg-red-50/40 border-red-200"
                        : isRetrying
                        ? "bg-amber-50/40 border-amber-200"
                        : "bg-gray-50/80 border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl ${
                            isFailed
                              ? "bg-red-100 text-red-700"
                              : isRetrying
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          <HugeiconsIcon icon={ItemIcon} className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {getActionDescription(task)}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono">
                            Type: {task.action_type}
                          </p>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isFailed
                            ? "bg-red-200 text-red-800"
                            : isRetrying
                            ? "bg-amber-200 text-amber-800"
                            : "bg-blue-200 text-blue-800"
                        }`}
                      >
                        {isFailed
                          ? "Failed"
                          : isRetrying
                          ? `Retry ${task.retry_count || 1}/5`
                          : "Pending"}
                      </span>
                    </div>

                    {/* Error / Backoff details if any */}
                    {task.last_error && (
                      <div className="mt-2.5 p-2.5 bg-white rounded-xl border border-gray-200/80 text-xs">
                        <p className="text-gray-500 font-semibold text-[11px]">
                          {isFailed ? "Permanent Failure Reason:" : "Last Attempt Note:"}
                        </p>
                        <p className="text-gray-800 font-mono text-[11px] mt-0.5 break-words">
                          {task.last_error}
                        </p>
                        {isRetrying && task.next_retry_at && (
                          <p className="text-[10px] text-amber-700 font-semibold mt-1">
                            Scheduled retry in{" "}
                            {Math.max(1, Math.round((task.next_retry_at - Date.now()) / 1000))}s
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action buttons (Separated & Protected) */}
                    <div className="mt-3 flex items-center justify-end gap-3 border-t border-gray-100/80 pt-3">
                      <button
                        type="button"
                        onClick={() => handleRetryItem(task.sync_id)}
                        disabled={isThisRetrying}
                        className="min-h-[38px] px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                      >
                        {isThisRetrying ? (
                          <>
                            <Spinner className="w-3.5 h-3.5 text-white" />
                            <span>Retrying...</span>
                          </>
                        ) : (
                          <>
                            <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" />
                            <span>Retry Now</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDiscardTask(task)}
                        disabled={isThisRetrying}
                        className="min-h-[38px] px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-red-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Bulk Actions */}
            {failedItems.length > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setConfirmDiscardAllModal(true)}
                  disabled={isRetryingAll || retryingIds.size > 0}
                  className="min-h-[44px] px-3 text-xs text-gray-600 hover:text-red-600 font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" />
                  <span>Discard All Failed ({failedItems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleRetryAll}
                  disabled={isRetryingAll || retryingIds.size > 0}
                  className="min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  {isRetryingAll ? (
                    <>
                      <Spinner className="w-3.5 h-3.5 text-white" />
                      <span>Retrying All...</span>
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" />
                      <span>Retry All Failed</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Single Discard */}
      <ConfirmationModal
        isOpen={Boolean(confirmDiscardTask)}
        onClose={() => setConfirmDiscardTask(null)}
        onConfirm={executeDiscardItem}
        title="Discard Unsynced Action"
        description="Are you sure you want to discard this offline action? Any pending submissions or progress changes in this action will be permanently lost."
        confirmText="Discard Action"
        type="danger"
      />

      {/* Confirmation Modal for Discard All */}
      <ConfirmationModal
        isOpen={confirmDiscardAllModal}
        onClose={() => setConfirmDiscardAllModal(false)}
        onConfirm={executeDiscardAll}
        title="Discard All Failed Actions"
        description={`Are you sure you want to discard all ${failedItems.length} failed offline actions? This action cannot be undone.`}
        confirmText="Discard All Failed"
        type="danger"
      />
    </>
  );
}
