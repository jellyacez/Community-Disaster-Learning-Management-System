import React from "react";
import UserNavbar from "./UserNavbar";
import UserSidebar from "./UserSidebar";

export default function DashboardLayout({
  children,
  currentUser,
  userInitials,
  sidebarOpen,
  setSidebarOpen,
}) {
  return (
    <div className="min-h-screen bg-gray-100">
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

      <div className="lg:pl-72">
        <UserNavbar
          currentUser={currentUser}
          userInitials={userInitials}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
