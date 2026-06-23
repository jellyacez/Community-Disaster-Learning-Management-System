import React from "react";
import { motion } from "framer-motion";

export default function LandingSteps() {
  const steps = [
    {
      num: "01",
      title: "Create Your Account",
      desc: "Register as a Bacolor resident to gain access to the training platform.",
    },
    {
      num: "02",
      title: "Begin at Level 1",
      desc: "Start with foundational disaster awareness modules designed for your community.",
    },
    {
      num: "03",
      title: "Pass Competency Assessments",
      desc: "Complete timed quizzes and scenario-based activities to advance to higher levels.",
    },
    {
      num: "04",
      title: "Earn Your Certificate",
      desc: "Receive a verifiable digital certificate tied to your profile upon successful completion.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-24 bg-gradient-to-br from-gray-900 to-red-950"
    >
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block bg-red-600/20 border border-red-500/20 text-red-300 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wide">
            How It Works
          </span>
          <h2 className="text-4xl font-extrabold text-white mb-3">
            Your Path to Preparedness
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto text-sm leading-relaxed">
            A structured, progressive journey from awareness to verified
            community competency.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.14 }}
              className="relative"
            >
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-6 h-px bg-red-500/40 z-10" />
              )}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center h-full">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-600/30 to-red-800/30 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
                  <span className="text-3xl font-black text-red-400">
                    {step.num}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
