import { SkeletonTableRow } from "../../../../../components/ui/Skeleton.jsx";

export default function UserDirectoryTable({ users, isLoading, meta, setPage, handleAccountAction }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 w-full space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100 pb-2 font-mono">
        Governance Personnel Node Tiers
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="pb-3 font-semibold uppercase tracking-wider">Identity Profile</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-center">Account Tier Role</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-50">
            {isLoading ? (
              [1, 2, 3].map((i) => <SkeletonTableRow key={i} columns={3} />)
            ) : users.filter(u => u.role !== "Field Responder").length === 0 ? (
              <tr>
                <td colSpan="3" className="py-6 text-center text-gray-400 italic">No administrative users found</td>
              </tr>
            ) : (
              users.filter(u => u.role !== "Field Responder").map((u) => (
                <tr key={u.id || u._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3">
                    <p className="font-semibold text-gray-800">{u.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{u.email}</p>
                  </td>
                  <td className="py-3 text-center">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 text-right space-x-2">
                    <button 
                      type="button" 
                      onClick={() => handleAccountAction(u.id || u._id, "archived system account record")} 
                      className="px-3 py-1.5 text-xs border border-slate-200 text-gray-700 hover:bg-slate-50 font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      Archive
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleAccountAction(u.id || u._id, "banned and terminated authorization credentials")} 
                      className="px-3 py-1.5 text-xs border border-red-200 text-red-600 hover:bg-red-600 hover:text-white font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      Ban
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!isLoading && meta.totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Page {meta.page} of {meta.totalPages} ({meta.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={meta.page === meta.totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
