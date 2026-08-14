import { HugeiconsIcon } from "@hugeicons/react";
import { CancelCircleIcon } from "@hugeicons/core-free-icons";

export default function CloseConfirmModal({
  ticketToClose,
  setTicketToClose,
  closeMutation,
}) {
  if (!ticketToClose) return null;

  const handleConfirmClose = () => {
    closeMutation.mutate(ticketToClose.feedback_id || ticketToClose.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <HugeiconsIcon icon={CancelCircleIcon} className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">Close this ticket?</h3>
        <p className="text-sm text-gray-500 mb-6">
          The resident will no longer be able to reply to this thread. This action cannot be undone.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setTicketToClose(null)}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmClose}
            disabled={closeMutation.isPending}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold text-sm"
          >
            {closeMutation.isPending ? "Closing..." : "Close Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
