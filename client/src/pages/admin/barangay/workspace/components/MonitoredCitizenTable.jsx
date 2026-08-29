import React from "react";
import PropTypes from "prop-types";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

export default function MonitoredCitizenTable({
  filteredResidents,
  selectedResident,
  setSelectedResident,
  searchFilter,
  setSearchFilter,
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Monitored Citizen Records</h3>
          <p className="text-xs text-gray-400">Residents belonging to your jurisdiction</p>
        </div>
        <div className="relative">
          <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search citizen..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-56"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100 bg-gray-50/50">
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Citizen Identity</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-center">Score</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-center">Status</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-gray-700">
            {filteredResidents.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-8 text-center text-gray-400 italic">
                  No citizen profiles found matching query.
                </td>
              </tr>
            ) : (
              filteredResidents.slice(0, 7).map((r) => (
                <tr
                  key={r.id || r._id}
                  onClick={() => setSelectedResident(r)}
                  className={`cursor-pointer transition-colors ${
                    selectedResident?.id === r.id ? "bg-red-50/60 font-medium" : "hover:bg-gray-50/50"
                  }`}
                >
                  <td className="py-3 px-3">
                    <div className="font-semibold text-gray-900">{r.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{r.email}</div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-gray-600">
                    {r.quizScore || 0}%
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        r.status === "Ready"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}
                    >
                      {r.status || "Pending"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedResident(r);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm"
                    >
                      Inspect
                    </button>
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

MonitoredCitizenTable.propTypes = {
  filteredResidents: PropTypes.array.isRequired,
  selectedResident: PropTypes.object,
  setSelectedResident: PropTypes.func.isRequired,
  searchFilter: PropTypes.string.isRequired,
  setSearchFilter: PropTypes.func.isRequired,
};
