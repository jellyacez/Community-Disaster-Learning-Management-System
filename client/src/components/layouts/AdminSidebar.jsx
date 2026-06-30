import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authClient } from "../../../lib/auth-client";
import LogoutModal from "../../ui/modals/LogoutModal";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Logout01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { ROLE_BASED_LINKS } from "../../../constants/adminNavLinks";

export default function AdminSidebar({ sidebarOpen, setSidebarOpen }) {
  const { data: session } = authClient.useSession();
  const location = useLocation();
  const navigate = useNavigate();

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
      console.error("Logout failed:", error);
      toast.error("Logout failed");
    } finally {
      setIsLogoutModalOpen(false);
    }
  };

  return (
    <>
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
            {session?.user?.name?.charAt(0).toUpperCase() || "A"}
          </div>
          <p className="font-semibold text-gray-900">{session?.user?.name || "Loading..."}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{userRole.replace('_', ' ')}</p>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 relative flex flex-col gap-2">
          {navLinks.map((group) => (
            <div key={group.category} className="mb-4 last:mb-0">
              <div className="mt-2 mb-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                {group.category}
              </div>
              <div className="flex flex-col gap-1">
                {group.items.map((link) => {
                  const isActive = location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);

                  return (
                    <button
                      key={link.path}
                      onClick={() => {
                        navigate(link.path);
                        setSidebarOpen(false);
                      }}
                      className={`group relative flex w-full h-[44px] items-center justify-between rounded-xl px-4 text-left transition-colors duration-200 z-10 cursor-pointer ${
                        isActive 
                          ? "bg-red-50 text-red-700 border-l-4 border-red-600 shadow-sm" 
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span className="relative z-10 flex items-center gap-3 font-semibold">
                        <HugeiconsIcon icon={link.icon} className={`w-5 h-5 ${isActive ? "text-red-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                        {link.name}
                      </span>
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        className={`relative z-10 w-4 h-4 ${
                          isActive ? "text-red-600" : "text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
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

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
}
