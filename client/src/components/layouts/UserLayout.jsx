import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { authClient } from "../../lib/auth-client";
import DashboardLayout from "./DashboardLayout";

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

export default function UserLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = authClient.useSession();

  const currentUser = {
    name:
      session?.user?.name ||
      session?.user?.fullName ||
      session?.user?.username ||
      "User",
    email: session?.user?.email || "No email available",
    barangay: session?.user?.barangay || "No barangay set",
    role: formatRole(session?.user?.role),
    image: session?.user?.image,
    
  };

  const userInitials = currentUser.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DashboardLayout
      currentUser={currentUser}
      userInitials={userInitials}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    >
      <Outlet context={{ currentUser, userInitials }} />
    </DashboardLayout>
  );
}
