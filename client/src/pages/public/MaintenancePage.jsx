import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings02Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import apiClient from "../../lib/apiClient";
import { authClient } from "../../lib/auth-client";
import { useNavigate, Link } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function MaintenancePage() {
  useDocumentTitle("System Maintenance | DRRM Portal");
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const { data: session } = authClient.useSession();

  // Force logout if resident session exists
  useEffect(() => {
    if (session?.user && session.user.role === "resident") {
      authClient.signOut();
    }
  }, [session]);

  // Verify if maintenance mode is disabled
  const checkStatus = async () => {
    setIsChecking(true);
    try {
      // Ping protected route to check system status
      const res = await apiClient.get("/user/dashboard");
      if (res.status === 200) {
        navigate("/");
      }
    } catch (error) {
      // Global interceptor handles 503 errors
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-2xl -z-10 pointer-events-none" />

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 md:p-12 max-w-lg w-full text-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm">
          <HugeiconsIcon icon={Settings02Icon} className="w-10 h-10 animate-spin-slow" style={{ animationDuration: '4s' }} />
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
          System Upgrades in Progress
        </h1>
        
        <p className="text-base text-gray-600 mb-8 leading-relaxed">
          The Bacolor DRRMO Learning Management System is currently undergoing scheduled maintenance to improve performance and security. We'll be back online shortly.
        </p>

        <div className="space-y-4">
          <button
            onClick={checkStatus}
            disabled={isChecking}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-sm shadow-red-200 hover:shadow-md hover:shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isChecking ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Check Status
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
              </>
            )}
          </button>
          
          {session?.user && session.user.role !== "resident" && (
            <p className="text-sm text-gray-500 font-medium mt-4">
              You are signed in. <Link to="/signin" className="text-red-600 hover:underline hover:text-red-700">Return to Dashboard</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
