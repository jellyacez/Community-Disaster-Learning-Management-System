import { useState, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
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
  const location = useLocation();

  const currentUser = {
    name:
      session?.user?.name ||
      session?.user?.fullName ||
      session?.user?.username ||
      "User",
    email: session?.user?.email || "No email available",
    barangay_id: session?.user?.barangay_id,
    role: formatRole(session?.user?.role),
    image: session?.user?.image,
  };

  const userInitials = currentUser.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const footerMode = useMemo(() => {
    const current = (location.pathname || "").toLowerCase();

    // 1. Pages where footer is permanently locked/pinned to viewport
    const pinnedKeywords = [
      "module",
      "catalog",
      "certificate",
      "enrolled",
      "feedback",
    ];
    if (pinnedKeywords.some((keyword) => current.includes(keyword))) {
      return "pinned";
    }

    // 2. Pages where footer is non-sticky (scrolls naturally below content)
    const scrollKeywords = ["dashboard", "announcement", "settings"];
    if (scrollKeywords.some((keyword) => current.includes(keyword))) {
      return "scroll";
    }

    // Fallback for any unmatched pages (default: natural scroll)
    return "scroll";
  }, [location.pathname]);

  return (
    <DashboardLayout
      currentUser={currentUser}
      userInitials={userInitials}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      footerMode={footerMode}
    >
      <Outlet context={{ currentUser, userInitials }} />
    </DashboardLayout>
  );
}