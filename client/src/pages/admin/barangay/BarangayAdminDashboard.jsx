import { Outlet } from "react-router-dom";
import useDocumentTitle from "../../../hooks/useDocumentTitle";

export default function BarangayAdminDashboard() {
  useDocumentTitle("Barangay Admin | DRRM Portal");

  return (
    <div className="w-full h-full font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="min-h-[600px] animate-in fade-in duration-200">
          <Outlet />
        </div>

      </div>
    </div>
  );
}