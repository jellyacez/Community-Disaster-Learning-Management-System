import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";

function getRoleDashboard(role, pathname = "") {
  if (role === "barangay_admin") return "/admin/barangay/dashboard";
  if (role === "mdrrmo_admin" || role === "head_mdrrmo_admin") return "/admin/mdrrmo/dashboard";
  if (role === "system_admin") return "/admin/system/dashboard";
  if (role === "resident") return "/userDashboard";

  // Pathname-based fallback if session role is not yet resolved
  if (pathname.startsWith("/admin/barangay")) return "/admin/barangay/dashboard";
  if (pathname.startsWith("/admin/mdrrmo")) return "/admin/mdrrmo/dashboard";
  if (pathname.startsWith("/admin/system")) return "/admin/system/dashboard";
  if (pathname.startsWith("/user")) return "/userDashboard";

  return "/";
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-colors">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl shadow-xl border border-red-100 dark:border-red-950/60 p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100 dark:border-red-900/40">
              <HugeiconsIcon
                icon={Alert01Icon}
                className="w-8 h-8 text-red-500"
              />
            </div>

            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
              Something went wrong.
            </h1>

            <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
              We encountered an unexpected issue while loading this section.
              Please refresh the page to try again, or return to the dashboard.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-500/20 text-white rounded-xl font-bold transition-all cursor-pointer"
              >
                <HugeiconsIcon icon={RefreshIcon} className="w-5 h-5" />
                Reload Application
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  const target = getRoleDashboard(this.props.userRole, window.location.pathname);
                  this.props.navigate(target);
                }}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/60 text-gray-700 dark:text-slate-200 rounded-xl font-bold transition-all cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundaryWrapper(props) {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const userRole = session?.user?.role;
  return <ErrorBoundary {...props} navigate={navigate} userRole={userRole} />;
}
