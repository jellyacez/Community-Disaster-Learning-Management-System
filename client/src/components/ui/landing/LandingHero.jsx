import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Location01Icon, ArrowRight01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";

export default function LandingHero() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-red-950 to-gray-900" />
      <div className="absolute top-24 right-0 w-96 h-96 bg-red-700 opacity-10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-orange-600 opacity-10 rounded-full blur-3xl pointer-events-none" />

      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 py-28 w-full">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-semibold px-4 py-2 rounded-full mb-6"
          >
            <HugeiconsIcon aria-hidden="true" icon={Location01Icon} className="w-3 h-3" />
            Bacolor, Pampanga — Municipal DRRM Community Initiative
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight"
          >
            Be Prepared.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              Stay Resilient.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-gray-300 leading-relaxed mb-10 max-w-2xl"
          >
            A community-based disaster preparedness learning system built for
            every Bacolor resident. Train, advance through levels, and earn
            certifications that prove your readiness.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <button
              onClick={() => navigate("/register")}
              className="cursor-pointer flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Start Training Free
              <HugeiconsIcon aria-hidden="true" icon={ArrowRight01Icon} className="w-5 h-5" />
            </button>

            <button
              onClick={() => navigate("/signin")}
              className="cursor-pointer flex items-center gap-2 px-8 py-4 text-white font-semibold rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm"
            >
              Sign In to Account
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-10"
          >
            {[
              { val: "3", sub: "Disaster Types Covered" },
              { val: "Multi-Level", sub: "Progressive Modules" },
              { val: "PWA", sub: "Works Offline" },
              { val: "QR-Verified", sub: "Digital Certificates" },
            ].map((s) => (
              <div key={s.val}>
                <p className="text-2xl font-extrabold text-white">{s.val}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-500">
        <span className="text-xs tracking-wide">SCROLL</span>
        <HugeiconsIcon aria-hidden="true" icon={ArrowDown01Icon} className="w-4 h-4 animate-bounce" />
      </div>
    </section>
  );
}
