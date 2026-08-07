import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authClient } from "../../lib/auth-client";
import LogoutModal from "../ui/modals/LogoutModal";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Logout01Icon, ArrowRight01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { ROLE_BASED_LINKS } from "../../constants/adminNavLinks";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function AdminSidebar({ sidebarOpen, setSidebarOpen }) {
  const { data: session } = authClient.useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [expandedMenus, setExpandedMenus] = useState({});

  const userRole = session?.user?.role || "resident";
  const navLinks = ROLE_BASED_LINKS[userRole] || [];

  const activeLink = navLinks.flatMap(group => group.items).find(
    link => location.pathname === link.path || location.pathname.startsWith(`${link.path}/`)
  );

  useDocumentTitle(activeLink ? `${activeLink.name} | DRRM Bacolor` : "Admin Portal | DRRM Bacolor");

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const confirmLogout = async () => {
    try {
      sessionStorage.setItem("isLoggingOut", "true");
      queryClient.cancelQueries();
      queryClient.clear();
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
        className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-red-800 bg-red-700">
          <span className="text-white font-bold text-xl tracking-tight">Admin Portal</span>
          <button 
            className="lg:hidden text-white/70 hover:text-white"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
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
                  const hasSubItems = link.subItems && link.subItems.length > 0;
                  const isExpanded = !!expandedMenus[link.name];
                  
                  // For a flat link, it is active if it matches exactly or is a subpath.
                  // For a parent link, it is active if any of its subItems match.
                  const isActive = hasSubItems
                    ? link.subItems.some(sub => location.pathname === sub.path || location.pathname.startsWith(`${sub.path}/`))
                    : (location.pathname === link.path || (link.path && location.pathname.startsWith(`${link.path}/`)));

                  const handleItemClick = () => {
                    if (hasSubItems) {
                      setExpandedMenus(prev => ({
                        ...prev,
                        [link.name]: !prev[link.name]
                      }));
                    } else {
                      navigate(link.path);
                      setSidebarOpen(false);
                    }
                  };

                  return (
                    <div key={link.name || link.path} className="flex flex-col">
                      <button
                        onClick={handleItemClick}
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
                        
                        {hasSubItems ? (
                          <HugeiconsIcon
                            icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
                            className={`relative z-10 w-4 h-4 ${isActive ? "text-red-600" : "text-gray-500"}`}
                          />
                        ) : (
                          <HugeiconsIcon
                            icon={ArrowRight01Icon}
                            className={`relative z-10 w-4 h-4 ${
                              isActive ? "text-red-600" : "text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            }`}
                          />
                        )}
                      </button>

                      {/* SubItems rendering */}
                      {hasSubItems && isExpanded && (
                        <div className="mt-1 flex flex-col gap-1 ml-4 pl-4 border-l border-gray-200">
                          {link.subItems.map((subLink) => {
                            const isSubActive = location.pathname === subLink.path || location.pathname.startsWith(`${subLink.path}/`);
                            return (
                              <button
                                key={subLink.path}
                                onClick={() => {
                                  navigate(subLink.path);
                                  setSidebarOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  isSubActive
                                    ? "bg-red-50 text-red-700 font-semibold"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                }`}
                              >
                                {subLink.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
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

