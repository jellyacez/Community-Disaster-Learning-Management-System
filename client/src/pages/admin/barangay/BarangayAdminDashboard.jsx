import { Outlet, useLocation } from "react-router-dom";
import useDocumentTitle from "../../../hooks/useDocumentTitle";

export default function BarangayAdminDashboard() {
  useDocumentTitle("Barangay Admin | DRRM Portal");
  const location = useLocation();

  const getHeaderTitle = () => {
    if (location.pathname.includes("/dashboard")) return "Dashboard Overview";
    if (location.pathname.includes("/registry")) return "Residential Compliance Registry";
    if (location.pathname.includes("/categories")) return "Localized Category Configurations";
    if (location.pathname.includes("/logs")) return "System Web Logs Audit Trail";
    if (location.pathname.includes("/syllabus")) return "Active Central Training Curriculum";
    return "Barangay Administration Desk";
  };

  return (
    <div className="w-full h-full font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Main Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-sans tracking-tight">
              {getHeaderTitle()}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Bacolor Disaster Preparedness Training Program</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-sm animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Barangay Active</span>
          </div>
        </div>

        <div className="min-h-[600px] animate-in fade-in duration-200">
          <Outlet />
        </div>

      </div>
    </div>
  );
}
