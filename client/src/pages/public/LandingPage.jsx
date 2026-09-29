// --- START: LandingPage.jsx ---
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { authClient } from "../../lib/auth-client";
import apiClient from "../../lib/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import useDocumentTitle from "../../hooks/useDocumentTitle";
import LandingNavbar from "../../components/ui/landing/LandingNavbar";
import LandingHero from "../../components/ui/landing/LandingHero";
import LandingHazards from "../../components/ui/landing/LandingHazards";
import LandingFeatures from "../../components/ui/landing/LandingFeatures";
import LandingSteps from "../../components/ui/landing/LandingSteps";
import LandingFooter from "../../components/ui/landing/LandingFooter";
import LandingFAQ from "../../components/ui/landing/LandingFAQ";

export default function LandingPage() {
  useDocumentTitle("Home | Bacolor LMS");
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (sessionStorage.getItem("isLoggingOut") === "true") {
      if (!session && !isPending) {
        sessionStorage.removeItem("isLoggingOut");
      }
      return;
    }

    if (session && !isPending) {
      const userRole = session.user?.role;
      const isAdmin = [
        "system_admin",
        "head_mdrrmo_admin",
        "mdrrmo_admin",
        "barangay_admin",
      ].includes(userRole);
      const mfaBypass = import.meta.env.VITE_DISABLE_MFA === "true";

      if (isAdmin && !session.user.twoFactorEnabled && !mfaBypass) {
        navigate("/admin/mfa-setup", { replace: true });
        return;
      }

      if (userRole === "system_admin") {
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      // Check maintenance status for all other roles
      apiClient
        .get("/public/status")
        .then(() => {
          if (userRole === "mdrrmo_admin" || userRole === "head_mdrrmo_admin") {
            navigate("/admin/mdrrmo/dashboard", { replace: true });
          } else if (userRole === "barangay_admin") {
            navigate("/admin/barangay/dashboard", { replace: true });
          } else {
            navigate("/userDashboard", { replace: true });
          }
        })
        .catch((err) => {
          if (err.response?.status === 503) {
            navigate("/maintenance", { replace: true });
          } else if (err.response?.status === 401) {
            authClient.signOut();
          } else {
            navigate("/userDashboard", { replace: true });
          }
        });
    }
  }, [session, isPending, navigate]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white dark:bg-slate-950 font-sans antialiased flex flex-col">
      <LandingNavbar />
      <LandingHero />
      <LandingHazards />
      <LandingFeatures />
      <LandingSteps />

      {/* Alignment Banner */}
      <section className="py-8 sm:py-10 bg-gray-50 dark:bg-slate-900/60 border-y border-gray-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[11px] sm:text-xs text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-4 sm:mb-5">
            Training Content Aligned With
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 sm:gap-x-10 sm:gap-y-4">
            {[
              "Philippine Red Cross",
              "NDRRMC",
              "Bacolor MDRRMO",
              "Republic Act 10121",
            ].map((org) => (
              <div key={org} className="flex items-center gap-2 shrink-0">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-slate-200 whitespace-nowrap">
                  {org}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <LandingFAQ />

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-red-700 via-red-600 to-rose-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block bg-white/20 text-white/95 text-[11px] sm:text-xs font-bold px-3.5 sm:px-4 py-1.5 rounded-full mb-4 sm:mb-5 uppercase tracking-wide border border-white/20">
              Join Your Community
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-3.5 sm:mb-4 leading-tight tracking-tight">
              Ready to Start Your Preparedness Training?
            </h2>
            <p className="text-sm sm:text-base text-red-100 max-w-xl mx-auto mb-7 sm:mb-8 leading-relaxed font-medium">
              Disaster readiness starts with a single step.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 min-h-[48px] bg-white text-red-700 text-sm sm:text-base font-extrabold rounded-xl shadow-lg hover:bg-red-50 active:scale-[0.98] transition-all cursor-pointer select-none"
              >
                <span>Create Free Account</span>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={ArrowRight01Icon}
                  className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                />
              </button>
              <button
                type="button"
                onClick={() => navigate("/signin")}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-3.5 min-h-[48px] text-white text-sm sm:text-base font-bold rounded-xl border-2 border-white/40 hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer select-none"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
// --- END: LandingPage.jsx ---
