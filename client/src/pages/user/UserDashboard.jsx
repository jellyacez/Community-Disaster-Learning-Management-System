import React, { useState, useEffect } from "react";
import { useOutletContext, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Notification03Icon,
  CheckmarkBadge01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import DashboardLayout from "../../components/layouts/DashboardLayout.jsx";
import AnnouncementCard from "../../components/ui/AnnouncementCard.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import { announcements, modules } from "../../data/mockData.js";

export default function UserDashboard() {
  const { currentUser } = useOutletContext();
  const enrolledModules = modules.filter((module) => module.enrolled);

  const location = useLocation();
  const navigate = useNavigate();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (location.state?.showWelcome) {
      setShowWelcomeModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Framer Motion variants for staggered step animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <div className="animate-in fade-in duration-300 relative">
      {/* Welcome Modal Overlay */}
      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl"
            >
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="absolute right-5 top-5 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" />
              </button>

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-8 h-8" />
              </div>

              <h2 className="text-center text-2xl font-extrabold text-gray-900">
                Successfully Registered!
              </h2>
              <p className="mt-2 text-center text-sm text-gray-500">
                Welcome to the Disaster Risk Reduction and Management Portal,{" "}
                <span className="font-semibold text-gray-900">
                  {currentUser.name}
                </span>
                ! Here is how to get started:
              </p>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="mt-8 space-y-6"
              >
                <motion.div variants={itemVariants} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-sm">
                    <span className="text-sm font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Browse the Module Catalog
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Click on <span className="font-semibold">Module Catalog</span> in the left sidebar to explore all available DRRM training topics.
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-sm">
                    <span className="text-sm font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Enroll in a Module
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Find a topic that interests you and click <span className="font-semibold">Enroll</span> to add it to your personal learning queue.
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-sm">
                    <span className="text-sm font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Start Learning</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Head to <span className="font-semibold">Enrolled Modules</span> to begin your training and earn your certifications!
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, type: "spring", stiffness: 300 }}
                onClick={() => setShowWelcomeModal(false)}
                className="mt-8 w-full rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-red-700 hover:shadow-xl transition cursor-pointer"
              >
                Get Started Now
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        <section className="rounded-3xl bg-gradient-to-r from-red-700 via-red-600 to-rose-600 p-8 text-white shadow-lg">
          <p className="text-sm uppercase tracking-widest text-red-100">
            Welcome back
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-extrabold">
            Hello, {currentUser.name}
          </h1>
          <p className="mt-3 max-w-2xl text-red-100">
            Continue your disaster preparedness training, stay updated with
            municipal announcements, and track your learning progress in one
            place.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-50 transition cursor-pointer">
              Browse Modules
            </button>
            <button className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition cursor-pointer">
              Continue Learning
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Available Modules"
            value={modules.length}
            subtitle="Training modules ready for access"
          />
          <StatCard
            title="Enrolled Modules"
            value={enrolledModules.length}
            subtitle="Modules currently in progress"
          />
          <StatCard
            title="Announcements"
            value={announcements.length}
            subtitle="Latest updates from the system"
          />
          <StatCard
            title="Completion Rate"
            value="54%"
            subtitle="Overall learning progress estimate"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Continue Your Modules
                </h2>
                <p className="text-sm text-gray-500">
                  Resume training where you left off.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {enrolledModules.map((module) => (
                <div
                  key={module.id}
                  className="rounded-2xl border border-gray-200 p-5 hover:border-red-200 transition cursor-pointer"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                          {module.category}
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {module.level}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {module.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {module.description}
                      </p>
                    </div>

                    <div className="min-w-52">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-500">
                          Progress
                        </span>
                        <span className="font-bold text-gray-900">
                          {module.progress}%
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-red-600"
                          style={{ width: `${module.progress}%` }}
                        />
                      </div>
                      <button className="mt-4 w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition cursor-pointer">
                        Resume Module
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <HugeiconsIcon
                icon={Notification03Icon}
                className="w-5 h-5 text-red-600"
              />
              <h2 className="text-xl font-bold text-gray-900">
                Latest Announcements
              </h2>
            </div>

            <div className="space-y-4">
              {announcements.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-gray-50 p-4 hover:bg-gray-100 transition cursor-pointer border border-transparent hover:border-gray-200"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    {item.date}
                  </p>
                  <h3 className="mt-2 text-sm font-bold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
