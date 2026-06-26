import React, { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authClient } from "../../lib/auth-client";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  DashboardSquare01Icon, 
  Settings01Icon, 
  Logout01Icon, 
  Menu01Icon, 
  Cancel01Icon,
  UserGroupIcon
} from "@hugeicons/core-free-icons";

export default function AdminLayout() {
  const { data: session } = authClient.useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = session?.user?.role || "resident";

  const getNavLinks = (role) => {
    const links = [];

    if (role === "system_admin") {
      links.push({ name: "Dashboard", path: "/admin/dashboard", icon: DashboardSquare01Icon });
      links.push({ name: "System Settings", path: "/admin/settings", icon: Settings01Icon });
    } else if (role === "mdrrmo_admin") {
      links.push({ name: "MDRRMO Dashboard", path: "/admin/mdrrmo/dashboard", icon: DashboardSquare01Icon });
      links.push({ name: "Disaster Reports", path: "/admin/mdrrmo/reports", icon: UserGroupIcon });
    } else if (role === "barangay_admin") {
      links.push({ name: "Barangay Dashboard", path: "/admin/barangay/dashboard", icon: DashboardSquare01Icon });
      links.push({ name: "Resident Management", path: "/admin/barangay/residents", icon: UserGroupIcon });
    }

    return links;
  };

  const navLinks = getNavLinks(userRole);

  const handleSignOut = async () => {
    sessionStorage.setItem("isLoggingOut", "true");
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Successfully logged out!");
          navigate("/signin", { replace: true });
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
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

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center px-3 py-2.5 rounded-xl transition-colors ${
                  isActive 
                    ? "bg-red-50 text-red-700 font-medium" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <HugeiconsIcon icon={link.icon} className={`w-5 h-5 mr-3 ${isActive ? "text-red-600" : "text-gray-400"}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-3 py-2.5 text-gray-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors"
          >
            <HugeiconsIcon icon={Logout01Icon} className="w-5 h-5 mr-3 text-gray-400" />
            Sign Out
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
    </div>
  );
}
