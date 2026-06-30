import React from "react";

export default function ResidentInspectorPanel({ selectedResident, onVerifyCertificate }) {
  if (!selectedResident) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-gray-400 space-y-3 py-10 opacity-70 min-h-[250px]">
        <svg className="w-12 h-12 stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
        <p className="text-xs font-medium text-center leading-relaxed">
          Cross-reference required.<br/>Select a row parameter to mount data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 flex-1 flex flex-col justify-between animate-in fade-in duration-200 min-h-[250px]">
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center space-y-1 shadow-sm">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full mx-auto flex items-center justify-center font-bold text-xl font-mono mb-2 border-2 border-white shadow-sm">
          {selectedResident.name.charAt(0)}
        </div>
        <p className="font-bold text-gray-900 leading-tight">{selectedResident.name}</p>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-mono">
          ID: {selectedResident.id || selectedResident._id || Math.floor(Math.random() * 10000)}
        </p>
      </div>
      
      <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-xs flex-1">
        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
          <span className="text-gray-500 font-semibold">Registered Origin:</span>
          <span className="font-bold text-gray-900">{selectedResident.barangay}</span>
        </div>
        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
          <span className="text-gray-500 font-semibold">Overall Analytics:</span>
          <span className="font-bold text-amber-600 font-mono">{selectedResident.quizScore || 0}% Accuracy</span>
        </div>
        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
          <span className="text-gray-500 font-semibold">Completed Steps:</span>
          <span className="font-bold text-gray-900">{selectedResident.modulesCompleted || 0} Modules</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-semibold">Risk State:</span>
          <span className={`font-bold tracking-wider px-2 py-0.5 rounded ${
            selectedResident.status === "Ready" ? "text-emerald-700 bg-emerald-100" : "text-amber-700 bg-amber-100"
          }`}>
            {selectedResident.status || "Pending"}
          </span>
        </div>
      </div>

      {selectedResident.status === "Ready" && onVerifyCertificate && (
        <button 
          type="button" 
          onClick={() => onVerifyCertificate(selectedResident.name)} 
          className="w-full py-2.5 mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 hover:border-emerald-300 transition-colors shadow-sm"
        >
          Inspect Certificate Record
        </button>
      )}
    </div>
  );
}
