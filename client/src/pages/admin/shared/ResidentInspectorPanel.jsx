
import StatusBadge from "../../../components/ui/StatusBadge";

export default function ResidentInspectorPanel({ selectedResident, onVerifyCertificate }) {
  if (!selectedResident) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-gray-400 space-y-3 py-10 opacity-70 min-h-[250px]">
        <svg className="w-12 h-12 stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
        <p className="text-xs font-medium text-center leading-relaxed">
          Select a citizen from the table to view audit details.
        </p>
      </div>
    );
  }

  const modulesCompleted = selectedResident.modulesCompleted ?? 0;
  const isCertified = modulesCompleted > 0;

  return (
    <div className="space-y-5 flex-1 flex flex-col justify-between animate-in fade-in duration-200 min-h-[250px]">
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center space-y-1 shadow-sm">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full mx-auto flex items-center justify-center font-bold text-xl mb-2 border-2 border-white shadow-sm">
          {selectedResident.name.charAt(0)}
        </div>
        <p className="font-bold text-gray-900 leading-tight">{selectedResident.name}</p>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-mono">
          ID: {selectedResident.id || selectedResident._id || "Unknown"}
        </p>
      </div>
      
      <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-xs flex-1">
        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
          <span className="text-gray-500 font-semibold">Barangay:</span>
          <span className="font-bold text-gray-900">{selectedResident.barangay || "Local Jurisdiction"}</span>
        </div>
        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
          <span className="text-gray-500 font-semibold">Account Standing:</span>
          <span>
            {selectedResident.banned ? (
              <StatusBadge color="red">Banned</StatusBadge>
            ) : selectedResident.archived ? (
              <StatusBadge color="slate">Archived</StatusBadge>
            ) : (
              <StatusBadge color="emerald">Active</StatusBadge>
            )}
          </span>
        </div>
        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
          <span className="text-gray-500 font-semibold">Modules Completed:</span>
          <span className="font-bold text-gray-900">{modulesCompleted} {modulesCompleted === 1 ? "Module" : "Modules"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-semibold">Compliance Status:</span>
          <span>
            {isCertified ? (
              <StatusBadge color="emerald">Certified</StatusBadge>
            ) : (
              <StatusBadge color="amber">Pending</StatusBadge>
            )}
          </span>
        </div>
      </div>

      {isCertified && onVerifyCertificate && (
        <button 
          type="button" 
          onClick={() => onVerifyCertificate(selectedResident.name)} 
          className="w-full py-2.5 mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 hover:border-emerald-300 transition-colors shadow-sm cursor-pointer"
        >
          Inspect Certificate Record
        </button>
      )}
    </div>
  );
}
