import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookOpen01Icon,
  Award01Icon,
  Wifi01Icon,
  Shield01Icon,
  UserGroupIcon,
  Building02Icon,
} from "@hugeicons/core-free-icons";

export default function LandingFeatures() {
  const features = [
    {
      icon: <HugeiconsIcon aria-hidden="true" icon={BookOpen01Icon} className="w-5 h-5" />,
      title: "Progressive Multi-Level Learning",
      description:
        "Advance through competency levels as you complete modules — starting from disaster basics and moving to advanced preparedness skills.",
    },
    {
      icon: <HugeiconsIcon aria-hidden="true" icon={Award01Icon} className="w-5 h-5" />,
      title: "Verifiable Digital Certificates",
      description:
        "Earn QR-secured digital certificates upon completing training, recognized by barangay and municipal DRRM offices.",
    },
    {
      icon: <HugeiconsIcon aria-hidden="true" icon={Wifi01Icon} className="w-5 h-5" />,
      title: "Offline Access via PWA",
      description:
        "Progressive Web App technology lets you continue your training even when internet connectivity is interrupted — built for barangay-level realities.",
    },
    {
      icon: <HugeiconsIcon aria-hidden="true" icon={Shield01Icon} className="w-5 h-5" />,
      title: "Secure Role-Based Access",
      description:
        "Encrypted records and role-specific dashboards ensure your training data stays protected and accessible only to authorized users.",
    },
    {
      icon: <HugeiconsIcon aria-hidden="true" icon={UserGroupIcon} className="w-5 h-5" />,
      title: "Community-Wide Coverage",
      description:
        "Connects residents, barangay officials, and MDRRMO administrators in a unified platform for coordinated community preparedness.",
    },
    {
      icon: <HugeiconsIcon aria-hidden="true" icon={Building02Icon} className="w-5 h-5" />,
      title: "Locally Adapted Content",
      description:
        "All training content is tailored to Bacolor's specific hazards, aligned with Philippine Red Cross and NDRRMC standards.",
    },
  ];

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block bg-gray-100 text-gray-600 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wide">
            System Features
          </span>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-3">
            Built for the Community, Inside Out
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
            Every feature accounts for barangay-level realities.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
              className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-red-100 hover:bg-red-50/20 transition-all group cursor-default"
            >
              <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
                {feature.icon}
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-2">
                {feature.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
