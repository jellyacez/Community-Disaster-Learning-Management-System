import UserNavbar from "./UserNavbar";
import UserSidebar from "./UserSidebar";
import PortalFooter from "../ui/PortalFooter";

export default function DashboardLayout({
  children,
  currentUser,
  userInitials,
  sidebarOpen,
  footerMode = "none", // "pinned" | "scroll" | "none"
  setSidebarOpen,
}) {
  const isPinned = footerMode === "pinned";

  return (
    <div
      className={`bg-gray-100 dark:bg-slate-950 transition-colors duration-200 ${
        isPinned ? "h-screen overflow-hidden" : "min-h-screen flex flex-col"
      }`}
    >
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <UserSidebar
        currentUser={currentUser}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Column */}
      <div
        className={`lg:pl-72 flex flex-col ${
          isPinned ? "h-screen overflow-hidden flex-1" : "flex-1 min-h-screen"
        }`}
      >
        <UserNavbar
          currentUser={currentUser}
          userInitials={userInitials}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Dynamic Content Area */}
        <main
          className={`px-4 py-6 sm:px-6 lg:px-8 flex-1 ${
            isPinned ? "overflow-y-auto" : ""
          }`}
        >
          {children}
        </main>

        {/* Render footer if pinned or scroll mode is active */}
        {footerMode !== "none" && <PortalFooter />}
      </div>
    </div>
  );
}