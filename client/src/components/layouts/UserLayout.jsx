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
    case "resident":
      return "Resident / Learner";
    default:
      return role || "Resident / Learner";
  }
}

export default function UserLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const location = useLocation();

  // Read impersonation profile if active
  const impersonatedTargetRaw = sessionStorage.getItem("impersonated_target_user");
  let impersonatedUser = null;
  try {
    impersonatedUser = impersonatedTargetRaw ? JSON.parse(impersonatedTargetRaw) : null;
  } catch {
    impersonatedUser = null;
  }

  const activeUser = impersonatedUser || session?.user;

  const currentUser = {
    name:
      activeUser?.name ||
      activeUser?.fullName ||
      activeUser?.username ||
      "User",
    email: activeUser?.email || "No email available",
    barangay_id: activeUser?.barangay_id || activeUser?.barangayId,
    role: formatRole(activeUser?.role),
    image: activeUser?.image,
  };

  const userInitials = (currentUser.name || "U")
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