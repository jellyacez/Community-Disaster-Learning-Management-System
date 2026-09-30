import { useState, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useOfflineSession } from "../../hooks/offlineSession";
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
  const { data: session, isOffline } = useOfflineSession();
  const location = useLocation();

  const impersonatedUser = useMemo(() => {
    const raw =
      sessionStorage.getItem("impersonated_target_user") ||
      localStorage.getItem("impersonated_target_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const activeUser = impersonatedUser || session?.user;

  const currentUser = {
    id: activeUser?.id,
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

    const scrollKeywords = ["dashboard", "announcement", "settings"];
    if (scrollKeywords.some((keyword) => current.includes(keyword))) {
      return "scroll";
    }

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
      <Outlet context={{ currentUser, userInitials, isOffline }} />
    </DashboardLayout>
  );
}