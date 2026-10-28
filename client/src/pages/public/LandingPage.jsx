// --- START: LandingPage.jsx ---
import { useEffect } from "react";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
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
  useDocumentTitle("Home | Bacolor Disaster LMS");
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
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
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white dark:bg-slate-950 font-sans antialiased flex flex-col selection:bg-gray-200 selection:text-gray-950">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-gray-950 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <LandingNavbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-col focus:outline-none"
        >
          <LandingHero />
          <LandingHazards />
          <LandingFeatures />
          <LandingSteps />

          {/* Who publishes the training */}
          <section className="py-8 sm:py-10 bg-gray-50 dark:bg-slate-900/60 border-y border-gray-100 dark:border-slate-800">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <p className="mx-auto max-w-2xl text-sm sm:text-base text-gray-700 dark:text-slate-200 leading-relaxed text-balance">
                Training modules are published by the{" "}
                <span className="font-bold text-gray-950">Bacolor MDRRMO</span>,
                the municipal disaster office set up under Republic Act 10121,
                the Philippine Disaster Risk Reduction and Management Act of
                2010.
              </p>
              {/* Contact details from the office's official Facebook page */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 text-sm">
                <span className="font-semibold text-gray-950">
                  MDRRMO 24/7 hotline
                </span>
                <a
                  href="tel:09661365586"
                  className="inline-flex min-h-11 items-center text-gray-700 underline underline-offset-4 hover:text-gray-950"
                >
                  Globe 0987 654 3210
                </a>
                <a
                  href="tel:09294461940"
                  className="inline-flex min-h-11 items-center text-gray-700 underline underline-offset-4 hover:text-gray-950"
                >
                  Smart 0987 654 3210
                </a>
                <a
                  href="mailto:supportbacolor@gmail.com"
                  className="inline-flex min-h-11 items-center text-gray-700 underline underline-offset-4 hover:text-gray-950"
                >
                  supportbacolor@gmail.com
                </a>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <LandingFAQ />

          {/* CTA Section */}
          <section className="py-16 sm:py-20 lg:py-24 bg-gray-50 border-t border-gray-200">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-950 mb-3.5 sm:mb-4 leading-tight tracking-tight text-balance">
                  Ready to Start Your Preparedness Training?
                </h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto mb-7 sm:mb-8 leading-relaxed">
                  Disaster readiness starts with a single step.
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <Link
                    to="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 min-h-[48px] bg-red-600 text-white text-sm sm:text-base font-bold rounded-xl shadow-[0_8px_20px_-8px_rgba(220,38,38,0.6)] hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer select-none"
                  >
                    <span>Create Free Account</span>
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={ArrowRight01Icon}
                      className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                    />
                  </Link>
                  <Link
                    to="/signin"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-3.5 min-h-[48px] bg-white text-gray-900 text-sm sm:text-base font-semibold rounded-xl border border-gray-300 hover:border-gray-400 hover:bg-gray-100 active:scale-[0.98] transition-all cursor-pointer select-none"
                  >
                    Sign In
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
// --- END: LandingPage.jsx ---
