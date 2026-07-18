import { useState, useEffect } from "react";
import {
  Navigate,
  Outlet,
  Link,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { authClient } from "../../lib/auth-client";
import apiClient from "../../lib/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { data: session, isPending } = authClient.useSession();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [isMaintenanceChecked, setIsMaintenanceChecked] = useState(false);

  useEffect(() => {
    if (session && !isPending && session.user?.role === "resident") {
      apiClient
        .get("/public/status")
        .then(() => setIsMaintenanceChecked(true))
        .catch((err) => {
          // Block render on 503 MAINTENANCE_MODE
          if (err.response && err.response.status === 503) {
            // Let the global interceptor handle the redirect
          } else {
             setIsMaintenanceChecked(true);
          }
        });
    } else if (session && !isPending) {
      // Bypass check for admin roles
      setTimeout(() => setIsMaintenanceChecked(true), 0);
    }
  }, [session, isPending, setIsMaintenanceChecked]);

  if (
    isPending ||
    (session && session.user?.role === "resident" && !isMaintenanceChecked)
  ) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-white"
        aria-hidden="true"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!session) {
    if (sessionStorage.getItem("isLoggingOut") === "true") {
      return <Navigate to="/signin" replace />;
    }

    const errorParam = searchParams.get("error");

    if (errorParam) {
      return (
        <Navigate
          to={`/signin?error=${encodeURIComponent(errorParam)}`}
          replace
        />
      );
    }

    return (
      <Navigate
        to="/signin"
        state={{
          error:
            "You must be signed in to access this page. Please log in to continue.",
        }}
        replace
      />
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = session.user?.role;
    if (!userRole) {
      return (
        <div
          className="min-h-screen flex items-center justify-center bg-white"
          aria-hidden="true"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      );
    }

    const adminRoles = ["system_admin", "mdrrmo_admin", "barangay_admin"];
    const mfaBypass = import.meta.env.VITE_DISABLE_MFA === "true";
    if (
      adminRoles.includes(userRole) &&
      !session.user.twoFactorEnabled &&
      !mfaBypass
    ) {
      if (location.pathname !== "/admin/mfa-setup") {
        return <Navigate to="/admin/mfa-setup" replace />;
      }
    }

    if (!allowedRoles.includes(userRole)) {
      let homePath = "/";
      if (userRole === "system_admin") homePath = "/admin/dashboard";
      else if (userRole === "mdrrmo_admin")
        homePath = "/admin/mdrrmo/dashboard";
      else if (userRole === "barangay_admin")
        homePath = "/admin/barangay/dashboard";
      else if (userRole === "resident" || userRole === "user")
        homePath = "/userDashboard";

      return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-white px-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon
                aria-hidden="true"
                icon={Alert01Icon}
                className="w-8 h-8"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              You do not have the required permissions to view this page.
            </p>
            <Link
              to={homePath}
              className="block w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      );
    }
  }

  return <Outlet />;
}
