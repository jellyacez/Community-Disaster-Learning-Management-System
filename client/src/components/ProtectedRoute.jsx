import React from "react";
import { Navigate, Outlet, Link } from "react-router-dom";
import { authClient } from "../lib/auth-client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";

// checks if user is authenticated and has the required role to access the route
export default function ProtectedRoute({ allowedRoles }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!session) {
    if (sessionStorage.getItem("isLoggingOut") === "true") {
      return <Navigate to="/signin" replace />;
    }
    return (
      <Navigate
        to="/signin"
        state={{ error: "Please log in to access this page." }}
        replace
      />
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = session.user?.role;
    if (!userRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      );
    }

    if (!allowedRoles.includes(userRole)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon icon={Alert01Icon} className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              You do not have the required permissions to view this page.
            </p>
            <Link
              to="/"
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
// end of component
