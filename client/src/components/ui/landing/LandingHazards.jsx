import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { TsunamiIcon, Alert01Icon, FlameIcon, ChevronRightIcon } from "@hugeicons/core-free-icons";

export default function LandingHazards() {
  const navigate = useNavigate();

  const hazards = [
    {
      icon: <HugeiconsIcon aria-hidden="true" icon={TsunamiIcon} className="w-8 h-8" />,
      title: "Flooding",
      description:
        "Learn flood preparedness protocols, evacuation routes, and emergency response procedures specific to Bacolor's flood-prone areas near Mt. Pinatubo.",
      gradient: "from-blue-600 to-cyan-600",
      accent: "text-blue-700",
      border: "border-blue-200",
    },
    {
      icon: <HugeiconsIcon aria-hidden="true" icon={Alert01Icon} className="w-8 h-8" />,
      title: "Earthquake",
      description:
        'Understand seismic safety measures, drop-cover-hold procedures, and post-earthquake protocols — critical preparation for "The Big One" scenario.',
      gradient: "from-amber-500 to-orange-600",
      accent: "text-amber-700",
      border: "border-amber-200",
    },
    {
      icon: <HugeiconsIcon aria-hidden="true" icon={FlameIcon} className="w-8 h-8" />,
      title: "Fire",
      description:
        "Master fire prevention techniques, safe evacuation procedures, and community fire response methods aligned with local DRRM standards.",
      gradient: "from-red-500 to-rose-700",
      accent: "text-red-700",
      border: "border-red-200",
    },
  ];

  return (
    <section id="hazards" className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block bg-red-100 text-red-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wide">
            Covered Hazards
          </span>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-3">
            Training for Bacolor&apos;s Real Threats
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
            Modules are grounded in the specific hazards that Bacolor
            communities face.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {hazards.map((hazard, index) => (
            <motion.div
              key={hazard.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12 }}
              className={`rounded-2xl overflow-hidden border ${hazard.border} bg-white shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className={`bg-gradient-to-r ${hazard.gradient} p-6 flex items-center gap-4`}>
                <span className="text-white">{hazard.icon}</span>
                <h3 className="text-xl font-bold text-white">{hazard.title}</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 text-sm leading-relaxed">
                  {hazard.description}
                </p>
                <button
                  onClick={() => navigate("/signin")}
                  className={`mt-5 inline-flex items-center gap-1 text-xs font-bold ${hazard.accent} hover:underline`}
                >
                  Browse Modules{" "}
                  <HugeiconsIcon aria-hidden="true" icon={ChevronRightIcon} className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
