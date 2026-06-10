import React, { useState } from "react";
import { authClient } from "../../lib/auth-client";
import DashboardLayout from "./components/DashboardLayout";
import AnnouncementCard from "./components/AnnouncementCard";
import { announcements } from "./userData.js";

function formatRole(role) {
  switch (role) {
    case "system_admin":
      return "System Administrator";
    case "mdrrmo_admin":
      return "MDRRMO Administrator";
    case "barangay_admin":
      return "Barangay Administrator";
    case "user":
      return "Resident / Learner";
    default:
      return role || "Resident / Learner";
  }
}

export default function UserAnnouncements() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  const currentUser = {
    name:
      session?.user?.name ||
      session?.user?.fullName ||
      session?.user?.username ||
      "User",
    email: session?.user?.email || "No email available",
    barangay: session?.user?.barangay || "No barangay set",
    role: formatRole(session?.user?.role),
  };

  const userInitials = currentUser.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      window.location.href = "/signin";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <DashboardLayout
      currentUser={currentUser}
      userInitials={userInitials}
      onLogout={handleLogout}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Announcements
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Stay updated with training notices, local schedules, and portal
            updates.
          </p>
        </div>

        <div className="space-y-4">
          {announcements.map((item) => (
            <AnnouncementCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
