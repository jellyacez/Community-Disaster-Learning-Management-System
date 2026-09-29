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
import { ADMIN_ROLES } from "../../constants/roles";

export default function ProtectedRoute({ allowedRoles = [] }) {
  // 1. Declare all standard hooks first
  const { data: session, isPending } = authClient.useSession();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [isMaintenanceChecked, setIsMaintenanceChecked] = useState(false);
  const [sessionFailed, setSessionFailed] = useState(false);

  // 2. Read impersonation context from storage
  const impersonatedTargetRaw =
    sessionStorage.getItem("impersonated_target_user") ||
    localStorage.getItem("impersonated_target_user");

  let impersonatedUser = null;
  try {
    impersonatedUser = impersonatedTargetRaw ? JSON.parse(impersonatedTargetRaw) : null;
  } catch {
    impersonatedUser = null;
  }

  const isSuperAdmin = session?.user?.role === "super_admin";
  const isAdmin = (session?.user?.role && ADMIN_ROLES.includes(session.user.role)) || isSuperAdmin;

  // 3. Clear ghost impersonation cookies if storage was lost when navigating to user routes
  useEffect(() => {
    const hasStorage = Boolean(impersonatedUser);

    if (session?.user?.role === "super_admin" && !hasStorage) {
      if (location.pathname.startsWith("/user")) {
        apiClient.post("/admin/super/stop-impersonating").catch(() => {});
        window.location.href = "/admin/super/dashboard";
      }
    }
  }, [session, location.pathname, impersonatedUser]);

  // 4. Maintenance / health check
  useEffect(() => {
    let isMounted = true;

    if (session && !isPending && !isAdmin && !impersonatedUser) {
      apiClient
        .get("/public/status")
        .then(() => {
          if (isMounted) setIsMaintenanceChecked(true);
        })
        .catch((err) => {
          if (!isMounted) return;
          if (err.response && err.response.status === 503) {
            return;
          }
          if (err.response && err.response.status === 401) {
            authClient.signOut();
            setSessionFailed(true);
            return;
          }
          setIsMaintenanceChecked(true);
        });
    } else if (session && !isPending) {
      setTimeout(() => {
        if (isMounted) setIsMaintenanceChecked(true);
      }, 0);
    }

    return () => {
      isMounted = false;
    };
  }, [session, isPending, isAdmin, impersonatedUser]);

  if (sessionFailed) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ error: "Session expired. Please sign in again." }}
      />
    );
  }

  if (isPending || (session && !isAdmin && !isMaintenanceChecked && !impersonatedUser)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950"
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
          error: "You must be signed in to access this page. Please log in to continue.",
        }}
        replace
      />
    );
  }

  // MFA check only for actual admin sessions when not masquerading
  const mfaBypass = import.meta.env.VITE_DISABLE_MFA === "true";
  if (
    ADMIN_ROLES.includes(session.user.role) &&
    !session.user.twoFactorEnabled &&
    !mfaBypass &&
    !impersonatedUser
  ) {
    if (location.pathname !== "/admin/mfa-setup") {
      return <Navigate to="/admin/mfa-setup" replace />;
    }
  }

  // Role verification block
  if (allowedRoles && allowedRoles.length > 0) {
    // Unrestricted access for Super Admin
    if (isSuperAdmin) {
      return <Outlet />;
    }

    // Treat 'resident' and 'user' identically
    const normalizedAllowed = allowedRoles.flatMap((r) =>
      r === "resident" ? ["resident", "user"] : [r]
    );

    const effectiveRole = impersonatedUser?.role || session.user.role;
    const hasPermission =
      normalizedAllowed.includes(effectiveRole) ||
      normalizedAllowed.includes(session.user.role);

    if (!hasPermission) {
      let homePath = "/";
      if (session.user.role === "system_admin") homePath = "/admin/dashboard";
      else if (session.user.role === "mdrrmo_admin" || session.user.role === "head_mdrrmo_admin")
        homePath = "/admin/mdrrmo/dashboard";
      else if (session.user.role === "barangay_admin")
        homePath = "/admin/barangay/dashboard";
      else if (session.user.role === "resident" || session.user.role === "user")
        homePath = "/userDashboard";

      return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-white dark:bg-slate-950 px-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100 dark:border-slate-800">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon
                aria-hidden="true"
                icon={Alert01Icon}
                className="w-8 h-8"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
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