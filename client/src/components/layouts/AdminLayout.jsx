import { useState, useEffect, useRef, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, Sun01Icon, Moon02Icon } from "@hugeicons/core-free-icons";
import AdminSidebar from "./AdminSidebar";
import CriticalAlertBanner from "./CriticalAlertBanner";
import PortalFooter from "../ui/PortalFooter";
import { authClient } from "../../lib/auth-client";
import { useTheme } from "../../hooks/context/themeContext";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const userRole = session?.user?.role;
  const isSystemAdmin = userRole === "system_admin";
  const isMdrrmoAdmin = userRole === "mdrrmo_admin" || userRole === "head_mdrrmo_admin";
  const { theme, toggleTheme } = useTheme();

  const { pathname } = useLocation();
  const mainContentRef = useRef(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
  }, [pathname]);

  // Determine if the footer should flow naturally with content (non-sticky)
  const isScrollableFooter = useMemo(() => {
    if (!isMdrrmoAdmin) return false;

    const currentPath = (pathname || "").toLowerCase();
    const scrollKeywords = [
      "dashboard",
      "sector-overview",
      "certifications",
      "logs",
      "feedback",
    ];

    return (
      currentPath.includes("/admin/mdrrmo") &&
      scrollKeywords.some((keyword) => currentPath.includes(keyword))
    );
  }, [isMdrrmoAdmin, pathname]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden transition-colors duration-200">
      {isSystemAdmin && <CriticalAlertBanner />}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/* Main Content Column */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Header */}
          <header className="lg:hidden h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center px-4 justify-between shrink-0 transition-colors">
            <button
              className="text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" />
            </button>
            <span className="font-bold text-gray-900 dark:text-white">Admin Portal</span>
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <HugeiconsIcon
                icon={theme === "dark" ? Sun01Icon : Moon02Icon}
                className={`w-5 h-5 ${theme === "dark" ? "text-amber-400" : "text-gray-600"}`}
              />
            </button>
          </header>

          {/* Scrollable Page Body */}
          <div
            ref={mainContentRef}
            className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950 flex flex-col transition-colors"
          >
            <div className="flex-1 p-4 lg:p-8">
              <Outlet />
            </div>

            {/* Non-sticky footer flows naturally at the end of the scrollable content */}
            {isScrollableFooter && <PortalFooter />}
          </div>

          {/* Pinned/Sticky footer for other pages */}
          {!isScrollableFooter && <PortalFooter />}
        </main>
      </div>
    </div>
  );
}