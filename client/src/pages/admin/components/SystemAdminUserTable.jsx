import React from "react";
import { SkeletonTableRow } from "../../../components/ui/Skeleton.jsx";

export default function SystemAdminUserTable({
  users,
  loading,
  meta,
  setPage,
  handleEditUser,
  handleEditRole,
  handleArchive,
  handleResetPassword,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">
          User Management Directory
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading
              ? [1, 2, 3, 4, 5].map((i) => (
                  <SkeletonTableRow key={i} columns={5} />
                ))
              : users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-bold text-gray-900">
                      {user.name}
                    </td>
                    <td className="p-4 text-gray-600">{user.email}</td>
                    <td className="p-4">
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.archived ? (
                        <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
                          Archived
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-4 flex flex-wrap gap-2 justify-end min-w-[300px]">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                      >
                        Edit User
                      </button>
                      <button
                        onClick={() => handleEditRole(user)}
                        className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                      >
                        Edit Role
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="px-3 py-1.5 text-xs font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg transition"
                      >
                        Reset Pass
                      </button>
                      <button
                        onClick={() => handleArchive(user)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                          user.archived
                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                            : "bg-red-50 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        {user.archived ? "Unarchive" : "Archive"}
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!loading && meta.totalPages > 1 && (
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
