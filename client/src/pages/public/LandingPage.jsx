// --- START: LandingPage.jsx ---
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { authClient } from "../../lib/auth-client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import useDocumentTitle from "../../hooks/useDocumentTitle";
import LandingNavbar from "../../components/ui/landing/LandingNavbar";
import LandingHero from "../../components/ui/landing/LandingHero";
import LandingHazards from "../../components/ui/landing/LandingHazards";
import LandingFeatures from "../../components/ui/landing/LandingFeatures";
import LandingSteps from "../../components/ui/landing/LandingSteps";
import LandingFooter from "../../components/ui/landing/LandingFooter";

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
      const isAdmin = ["system_admin", "mdrrmo_admin", "barangay_admin"].includes(userRole);
      const mfaBypass = import.meta.env.VITE_DISABLE_MFA === "true";

      if (isAdmin && !session.user.twoFactorEnabled && !mfaBypass) {
        navigate("/admin/mfa-setup", { replace: true });
        return;
      }

      if (userRole === "system_admin")
        navigate("/admin/dashboard", { replace: true });
      else if (userRole === "mdrrmo_admin")
        navigate("/mdrrmo/dashboard", { replace: true });
      else if (userRole === "barangay_admin")
        navigate("/barangay/dashboard", { replace: true });
      else navigate("/userDashboard", { replace: true });
    }
  }, [session, isPending, navigate]);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <LandingNavbar />
      <LandingHero />
      <LandingHazards />
      <LandingFeatures />
      <LandingSteps />

      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-6">
            Training Content Aligned With
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10">
            {[
              "Philippine Red Cross",
              "NDRRMC",
              "Bacolor MDRRMO",
              "Republic Act 10121",
            ].map((org) => (
              <div key={org} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-bold text-gray-700">{org}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-r from-red-700 via-red-600 to-rose-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block bg-white/20 text-white/90 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide border border-white/20">
              Join Your Community
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-5 leading-tight">
              Ready to Start Your Preparedness Training?
            </h2>
            <p className="text-red-100 max-w-xl mx-auto mb-10 leading-relaxed">
              Disaster readiness starts with a single step.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate("/register")}
                className="flex items-center gap-2 px-10 py-4 bg-white text-red-700 font-extrabold rounded-xl shadow-xl hover:bg-red-50 transition-colors cursor-pointer"
              >
                Create Free Account
                <HugeiconsIcon aria-hidden="true" icon={ArrowRight01Icon} className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate("/signin")}
                className="px-10 py-4 text-white font-bold rounded-xl border-2 border-white/40 hover:bg-white/10 transition-colors cursor-pointer"
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
