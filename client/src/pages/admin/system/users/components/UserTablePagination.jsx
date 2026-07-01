import React from "react";

export default function UserTablePagination({ isLoading, meta, setPage, limit, setLimit }) {
  if (isLoading || (meta.totalPages <= 1 && meta.total <= 10)) return null;

  return (
    <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          Page {meta.page} of {meta.totalPages || 1}
        </span>
        <div className="flex items-center gap-2">
          <label htmlFor="rows" className="text-sm text-gray-500">Rows per page:</label>
          <select
            id="rows"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="text-sm border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
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
          disabled={meta.page === meta.totalPages || meta.totalPages === 0}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
