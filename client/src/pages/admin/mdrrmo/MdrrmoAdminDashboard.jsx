import React from "react";
import useDocumentTitle from "../../../hooks/useDocumentTitle";

export default function MdrrmoAdminDashboard() {
  useDocumentTitle("MDRRMO Dashboard | DRRM Portal");

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MDRRMO Dashboard</h1>
          <p className="text-gray-500">Overview of municipal disaster risk reduction and management.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder Stat Cards */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-gray-500 font-medium mb-1">Municipal Incidents</h3>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-gray-500 font-medium mb-1">Active Trainings</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-gray-500 font-medium mb-1">Resource Deployments</h3>
          <p className="text-3xl font-bold text-green-600">0</p>
        </div>
      </div>
    </div>
  );
}
