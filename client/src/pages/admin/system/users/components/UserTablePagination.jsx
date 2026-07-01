import React from "react";

export default function UserTablePagination({ isLoading, meta, setPage }) {
  if (isLoading || meta.totalPages <= 1) return null;

  return (
    <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
      <span className="text-sm text-gray-500">
        Page {meta.page} of {meta.totalPages}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={meta.page === 1}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
          disabled={meta.page === meta.totalPages}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
