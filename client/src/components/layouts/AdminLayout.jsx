import React, { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authClient } from "../../lib/auth-client";
import LogoutModal from "../ui/modals/LogoutModal";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  DashboardSquare01Icon, 
  Settings01Icon, 
  Logout01Icon, 
  Menu01Icon, 
  Cancel01Icon,
  UserGroupIcon,
  FolderAddIcon,
  UserAddIcon,
  Note01Icon,
  Task01Icon,
  ArrowRight01Icon,
  Database01Icon
} from "@hugeicons/core-free-icons";

const ROLE_BASED_LINKS = {
  system_admin: [
    { name: "Dashboard", path: "/admin/dashboard", icon: DashboardSquare01Icon },
    { name: "System Settings", path: "/admin/settings", icon: Settings01Icon },
  ],
  mdrrmo_admin: [
    { name: "Dashboard", path: "/admin/mdrrmo/dashboard", icon: DashboardSquare01Icon },
    { name: "Audited Sector Data", path: "/admin/mdrrmo/barangay-management", icon: Database01Icon },
    { name: "Training Modules", path: "/admin/mdrrmo/modules", icon: FolderAddIcon },
    { name: "Personnel Directory", path: "/admin/mdrrmo/users", icon: UserAddIcon },
    { name: "Disaster Reports", path: "/admin/mdrrmo/reports", icon: UserGroupIcon },
  ],
  barangay_admin: [
    { name: "Dashboard", path: "/admin/barangay/dashboard", icon: DashboardSquare01Icon },
    { name: "Full Registry Log", path: "/admin/barangay/registry", icon: Database01Icon },
    { name: "Category Content", path: "/admin/barangay/categories", icon: Settings01Icon },
    { name: "Audit Web Trail", path: "/admin/barangay/logs", icon: Note01Icon },
    { name: "Program Syllabus", path: "/admin/barangay/syllabus", icon: Task01Icon },
    { name: "Resident Management", path: "/admin/barangay/residents", icon: UserGroupIcon },
  ]
};

export default function AdminLayout() {
  const { data: session } = authClient.useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = session?.user?.role || "resident";

  const navLinks = ROLE_BASED_LINKS[userRole] || [];

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const confirmLogout = async () => {
    try {
      sessionStorage.setItem("isLoggingOut", "true");
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            navigate("/signin");
          },
        },
      });
      toast.success("Successfully logged out!");
    } catch (error) {
      toast.error("Logout failed");
    } finally {
      setIsLogoutModalOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-red-600">
          <span className="text-white font-bold text-xl tracking-tight">Admin Portal</span>
          <button 
            className="lg:hidden text-white hover:text-red-200"
            onClick={() => setSidebarOpen(false)}
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xl mb-2">
            {session?.user?.name?.charAt(0).toUpperCase()}
          </div>
          <p className="font-semibold text-gray-900">{session?.user?.name}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{userRole.replace('_', ' ')}</p>
        </div>

        {/* Sliding Pill Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 relative flex flex-col gap-2">
          <div
            className="hidden lg:block absolute left-4 right-4 top-5 h-[48px] rounded-xl bg-red-600 shadow-md transition-transform duration-300 ease-out z-0"
            style={{
              transform: `translateY(${
                navLinks.findIndex((link) => location.pathname === link.path || location.pathname.startsWith(`${link.path}/`)) * 56
              }px)`,
              opacity: navLinks.some((link) => location.pathname === link.path || location.pathname.startsWith(`${link.path}/`))
                ? 1
                : 0,
            }}
          />

          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);

            return (
              <button
                key={link.path}
                onClick={() => {
                  navigate(link.path);
                  setSidebarOpen(false);
                }}
                className={`group relative flex w-full h-[48px] items-center justify-between rounded-xl px-4 text-left transition-colors z-10 cursor-pointer ${
                  isActive 
                    ? "bg-red-600 lg:bg-transparent shadow-md lg:shadow-none text-white" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="relative z-10 flex items-center gap-3 font-semibold">
                  <HugeiconsIcon icon={link.icon} className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`} />
                  {link.name}
                </span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className={`relative z-10 w-4 h-4 ${
                    isActive ? "text-white" : "text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  }`}
                />
              </button>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <HugeiconsIcon aria-hidden="true" icon={Logout01Icon} className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center px-4 justify-between">
          <button 
            className="text-gray-500 hover:text-gray-900"
            onClick={() => setSidebarOpen(true)}
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

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
}
