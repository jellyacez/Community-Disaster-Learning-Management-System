import { useState } from "react";
import ConfirmationModal from "../../../../../components/ui/modals/ConfirmationModal.jsx";

export default function BulkActionBar({ selectedCount, onArchive, onCancel, isPending }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
        <span className="text-sm font-semibold text-red-800 text-center sm:text-left">
          {selectedCount} users selected
        </span>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={isPending}
            className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Archive Selected
          </button>
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 sm:flex-none px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold rounded-lg transition-colors text-center"
          >
            Cancel
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => {
          setIsModalOpen(false);
          onArchive();
        }}
        title="Confirm Bulk Archive"
        description={`Are you sure you want to archive ${selectedCount} selected users? They will be unable to log in.`}
        confirmText="Yes, Archive"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
}
