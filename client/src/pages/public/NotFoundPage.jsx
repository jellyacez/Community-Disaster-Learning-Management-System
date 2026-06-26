// --- START: NotFoundPage.jsx ---
import React from "react";
import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { DiscoverCircleIcon, Home09Icon } from "@hugeicons/core-free-icons";
import { authClient } from "../../lib/auth-client";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("404 Not Found | Bacolor LMS");
  
  const { data: session } = authClient.useSession();
  const role = session?.user?.role;
  
  let homePath = "/";
  if (role === "system_admin") homePath = "/admin/dashboard";
  else if (role === "mdrrmo_admin") homePath = "/admin/mdrrmo/dashboard";
  else if (role === "barangay_admin") homePath = "/admin/barangay/dashboard";
  else if (role === "resident" || role === "user") homePath = "/userDashboard";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-red-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-10 text-center">
        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <HugeiconsIcon aria-hidden="true" icon={DiscoverCircleIcon} className="w-12 h-12" />
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">404</h1>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Page Not Found</h2>

        <p className="text-gray-500 mb-8 leading-relaxed max-w-sm mx-auto">
          Oops! The page you are looking for doesn't exist, has been moved, or
          you typed the link incorrectly.
        </p>

        <Link
          to={homePath}
          className="inline-flex items-center justify-center gap-2 w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-200"
        >
          <HugeiconsIcon aria-hidden="true" icon={Home09Icon} className="w-5 h-5" />
          Return Home
        </Link>
      </div>
    </div>
  );
}
// --- END: NotFoundPage.jsx ---
