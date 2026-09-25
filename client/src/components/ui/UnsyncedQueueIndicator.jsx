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
import {
  retryFailedTask,
  discardFailedTask,
  getActionDescription,
  getAllSyncQueueItems,
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
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let isMounted = true;
    const fetchQueue = async () => {
      try {
        const items = await getAllSyncQueueItems();
        if (isMounted) {
          setQueueItems(items);
        }
      } catch (err) {
        console.error("Failed to read sync_queue:", err);
      }
    };

    const handleUpdate = () => {
      void fetchQueue();
    };

    void fetchQueue();
    window.addEventListener("offline-sync-queue-updated", handleUpdate);
    window.addEventListener("offline-sync-item-success", handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("offline-sync-queue-updated", handleUpdate);
      window.removeEventListener("offline-sync-item-success", handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const conflictItems = queueItems.filter(
    (i) => i.status === "conflict" || i.error_type === "conflict"
  );
  const failedItems = queueItems.filter(
    (i) => i.status === "failed" && i.error_type !== "conflict"
  );
  const attentionItems = queueItems.filter(
    (i) => i.status === "failed" || i.status === "conflict" || i.error_type === "conflict"
  );
  const retryingItems = queueItems.filter((i) => i.status === "retrying");

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
    if (isRetryingAll || retryingIds.size > 0 || failedItems.length === 0) return;
    setIsRetryingAll(true);
    toast.loading("Retrying all failed syncs...", { id: "retry-all" });
    try {
      for (const item of failedItems) {
        await retryFailedTask(item.sync_id);
      }
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
    for (const item of attentionItems) {
      await discardFailedTask(item.sync_id);
    }
    setConfirmDiscardAllModal(false);
    toast.success("Discarded all items requiring attention.");
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
          conflictItems.length > 0 && failedItems.length === 0
            ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60"
            : failedItems.length > 0
            ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-900/60 animate-pulse"
            : retryingItems.length > 0
            ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-900/60"
            : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/60"
        }`}
      >
        <HugeiconsIcon
          icon={conflictItems.length > 0 || failedItems.length > 0 ? AlertCircleIcon : RefreshIcon}
          className={`w-4 h-4 ${retryingItems.length > 0 ? "animate-spin" : ""}`}
        />
        <span>
          {conflictItems.length > 0 && failedItems.length === 0
            ? `${conflictItems.length} Conflict${conflictItems.length !== 1 ? "s" : ""}`
            : failedItems.length > 0
            ? `${failedItems.length} Sync Failed`
            : `${queueItems.length} Queued`}
        </span>
      </button>

      {/* Slide-Over Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900">
              <div>
                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <HugeiconsIcon
                    icon={conflictItems.length > 0 || failedItems.length > 0 ? AlertCircleIcon : RefreshIcon}
                    className={`w-5 h-5 ${
                      conflictItems.length > 0 && failedItems.length === 0
                        ? "text-amber-600 dark:text-amber-400"
                        : failedItems.length > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
                  />
                  Offline Sync Queue
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {queueItems.length} total queued action{queueItems.length !== 1 ? "s" : ""}
                  {attentionItems.length > 0 && ` · ${attentionItems.length} require attention`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close offline sync queue modal"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {queueItems.map((task) => {
                const ItemIcon = getItemIcon(task.action_type);
                const isConflict = task.status === "conflict" || task.error_type === "conflict";
                const isFailed = task.status === "failed" && !isConflict;
                const isRetrying = task.status === "retrying";
                const isThisRetrying = retryingIds.has(task.sync_id) || isRetryingAll;

                return (
                  <div
                    key={task.sync_id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isConflict
                        ? "bg-amber-50/40 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/70"
                        : isFailed
                        ? "bg-red-50/40 dark:bg-red-950/30 border-red-200 dark:border-red-900/50"
                        : isRetrying
                        ? "bg-amber-50/40 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50"
                        : "bg-gray-50/80 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl ${
                            isConflict
                              ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                              : isFailed
                              ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                              : isRetrying
                              ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                              : "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          <HugeiconsIcon icon={isConflict ? AlertCircleIcon : ItemIcon} className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
                            {getActionDescription(task)}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-slate-400 font-mono">
                            Type: {task.action_type}
                          </p>
                        </div>
                      </div>

                      {/* Status Tag & Session Badge */}
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {task.is_memory_only && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800">
                            Session Only
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isConflict
                              ? "bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                              : isFailed
                              ? "bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-200"
                              : isRetrying
                              ? "bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200"
                              : "bg-blue-200 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200"
                          }`}
                        >
                          {isConflict
                            ? "Conflict"
                            : isFailed
                            ? "Failed"
                            : isRetrying
                            ? `Retry ${task.retry_count || 1}/5`
                            : "Pending"}
                        </span>
                      </div>
                    </div>

                    {/* Conflict Explanation */}
                    {isConflict && (
                      <div className="mt-2.5 p-2.5 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-semibold text-[11px]">
                          <span>State Conflict</span>
                          {task.conflict_type && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900/70 text-[10px] font-mono">
                              {task.conflict_type}
                            </span>
                          )}
                        </div>
                        <p className="text-amber-800 dark:text-amber-200 text-[11px] mt-1 break-words leading-relaxed">
                          {task.last_error || "The ticket was closed on the server while you were offline. Your reply cannot be appended."}
                        </p>
                      </div>
                    )}

                    {/* Error / Backoff details if any (and not conflict) */}
                    {task.last_error && !isConflict && (
                      <div className="mt-2.5 p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-gray-200/80 dark:border-slate-700 text-xs">
                        <p className="text-gray-500 dark:text-slate-400 font-semibold text-[11px]">
                          {isFailed ? "Permanent Failure Reason:" : "Last Attempt Note:"}
                        </p>
                        <p className="text-gray-800 dark:text-slate-200 font-mono text-[11px] mt-0.5 break-words">
                          {task.last_error}
                        </p>
                        {isRetrying && task.next_retry_at && (
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
                            Scheduled retry in{" "}
                            {Math.max(1, Math.round((task.next_retry_at - now) / 1000))}s
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action buttons (Suppress Retry for Conflicts) */}
                    {isConflict ? (
                      <div className="mt-3 flex items-center justify-end gap-3 border-t border-amber-200/60 dark:border-amber-900/40 pt-3">
                        <button
                          type="button"
                          onClick={() => setConfirmDiscardTask(task)}
                          className="min-h-[38px] px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="w-3.5 h-3.5" />
                          <span>Dismiss Conflict</span>
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center justify-end gap-3 border-t border-gray-100/80 dark:border-slate-800 pt-3">
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
                          className="min-h-[38px] px-3.5 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-400 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Discard
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Bulk Actions */}
            {attentionItems.length > 1 && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setConfirmDiscardAllModal(true)}
                  disabled={isRetryingAll || retryingIds.size > 0}
                  className="min-h-[44px] px-3 text-xs text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" />
                  <span>Discard All ({attentionItems.length})</span>
                </button>

                {failedItems.length > 0 && (
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
                        <span>Retry All Failed ({failedItems.length})</span>
                      </>
                    )}
                  </button>
                )}
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
        title={
          confirmDiscardTask?.status === "conflict" || confirmDiscardTask?.error_type === "conflict"
            ? "Dismiss Conflict"
            : "Discard Unsynced Action"
        }
        description={
          confirmDiscardTask?.status === "conflict" || confirmDiscardTask?.error_type === "conflict"
            ? "Dismiss this conflicting action? It will be removed from your offline queue."
            : "Are you sure you want to discard this offline action? Any pending submissions or progress changes in this action will be permanently lost."
        }
        confirmText={
          confirmDiscardTask?.status === "conflict" || confirmDiscardTask?.error_type === "conflict"
            ? "Dismiss Conflict"
            : "Discard Action"
        }
        type={
          confirmDiscardTask?.status === "conflict" || confirmDiscardTask?.error_type === "conflict"
            ? "warning"
            : "danger"
        }
      />

      {/* Confirmation Modal for Discard All */}
      <ConfirmationModal
        isOpen={confirmDiscardAllModal}
        onClose={() => setConfirmDiscardAllModal(false)}
        onConfirm={executeDiscardAll}
        title="Discard All Items"
        description={`Are you sure you want to discard all ${attentionItems.length} failed/conflicting offline actions? This action cannot be undone.`}
        confirmText="Discard All"
        type="danger"
      />
    </>
  );
}
