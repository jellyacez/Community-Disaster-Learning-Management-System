import React from "react";
import { Outlet } from "react-router-dom";
import useDocumentTitle from "../../../hooks/useDocumentTitle";

export default function MdrrmoAdminDashboard() {
  useDocumentTitle("MDRRMO Dashboard | DRRM Portal");

  return (
    <div className="w-full h-full font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Main Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-sans tracking-tight">
              Municipal Disaster Risk Reduction and Management Office
            </h1>
            <p className="text-sm text-gray-500 mt-1">Staff & Responder Training Hub Portal</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-sm animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">MDRRM Hub Active</span>
          </div>
        </div>

        {/* Render Active Component */}
        <div className="min-h-[600px] animate-in fade-in duration-200">
          <Outlet />
        </div>
        
      </div>
    </div>
  );
}
