import { useState } from "react";
import { Outlet } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import AdminSidebar from "./AdminSidebar";
import CriticalAlertBanner from "./CriticalAlertBanner";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <CriticalAlertBanner />
      
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Header */}
          <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0">
            <button 
              className="text-gray-500 hover:text-gray-900"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" />
            </button>
            <span className="font-bold text-gray-900">Admin Portal</span>
            <div className="w-6" /> {/* Spacer for centering */}
          </header>

          <div className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
