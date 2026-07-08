import { SkeletonTableRow } from "../../../../../components/ui/Skeleton.jsx";

export default function ResidentDirectoryTable({ 
  residents, 
  isLoading, 
  setSelectedResident, 
  handleAccountAction 
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 w-full">
      <h3 className="text-xs font-bold uppercase tracking-wide mb-4 text-gray-400 border-b border-gray-100 pb-2 font-mono">
        District Accreditation Directory
      </h3>
      <div className="overflow-x-auto min-h-[280px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="pb-3 font-semibold uppercase tracking-wider">Resident Name</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Barangay Sector</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-center">Modules Finished</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-center">Safety Rating</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-50">
            {isLoading ? (
              [1, 2, 3, 4].map((i) => <SkeletonTableRow key={i} columns={5} />)
            ) : residents.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-6 text-center text-gray-400 italic">No residents found matching criteria</td>
              </tr>
            ) : (
              residents.map((r) => (
                <tr key={r.id || r._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 font-semibold text-gray-800">{r.name}</td>
                  <td className="py-3 font-mono text-gray-500">{r.barangay}</td>
                  <td className="py-3 text-center font-bold text-amber-600">{r.modulesCompleted || 0} Modules</td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      r.status === "Ready" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                    }`}>
                      {r.status || "Pending"}
                    </span>
                  </td>
                  <td className="py-3 text-right flex justify-end gap-2">
                    <button 
                      type="button" 
                      onClick={() => setSelectedResident(r)} 
                      className="px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                    >
                      Inspect
                    </button>
                    {r.status === "Ready" && (
                      <button 
                        type="button" 
                        onClick={() => handleAccountAction(r.id || r._id, "revoked credential tier")} 
                        className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-colors shadow-sm"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
