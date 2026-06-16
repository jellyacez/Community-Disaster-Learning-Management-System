import React, { useState, useEffect } from "react";
import { useOutletContext, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Notification03Icon,
  CheckmarkBadge01Icon,
  Cancel01Icon,
  BookOpen01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import DashboardLayout from "../../components/layouts/DashboardLayout.jsx";
import AnnouncementCard from "../../components/ui/AnnouncementCard.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import ModuleSkeleton from "../../components/ui/ModuleSkeleton.jsx";
import AnnouncementSkeleton from "../../components/ui/AnnouncementSkeleton.jsx";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import toast from "react-hot-toast";

export default function UserDashboard() {
  useDocumentTitle('Dashboard | Bacolor LMS');
  const { currentUser } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalModules: 0,
    announcements: [],
    enrolledModules: [],
    completionRate: 0,
  });

  useEffect(() => {
    if (location.state?.showWelcome) {
      setShowWelcomeModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/user/dashboard",
          {
            credentials: "include",
          },
        );
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="animate-in fade-in duration-300 relative">
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
                <HugeiconsIcon
                  icon={CheckmarkBadge01Icon}
                  className="w-8 h-8"
                />
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
                <motion.div
                  variants={itemVariants}
                  className="flex items-start gap-4"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-sm">
                    <span className="text-sm font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Browse the Module Catalog
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Click on{" "}
                      <span className="font-semibold">Module Catalog</span> in
                      the left sidebar to explore all available DRRM training
                      topics.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="flex items-start gap-4"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-sm">
                    <span className="text-sm font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Enroll in a Module
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Find a topic that interests you and click{" "}
                      <span className="font-semibold">Enroll</span> to add it to
                      your personal learning queue.
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, type: "spring", stiffness: 300 }}
                onClick={() => {
                  setShowWelcomeModal(false);
                  navigate("/user/catalog");
                }}
                className="mt-8 w-full rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-red-700 hover:shadow-xl transition cursor-pointer"
              >
                Go To Catalog Now
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
            <button
              onClick={() => navigate("/user/catalog")}
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-50 transition cursor-pointer"
            >
              Browse Modules
            </button>
            <button
              onClick={() => navigate("/user/modules")}
              className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition cursor-pointer"
            >
              Continue Learning
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Available Modules"
            value={loading ? "..." : dashboardData.totalModules}
            subtitle="Training modules ready for access"
          />
          <StatCard
            title="Enrolled Modules"
            value={loading ? "..." : dashboardData.enrolledModules.length}
            subtitle="Modules currently in progress"
          />
          <StatCard
            title="Announcements"
            value={loading ? "..." : dashboardData.announcements.length}
            subtitle="Latest updates from the system"
          />
          <StatCard
            title="Completion Rate"
            value={loading ? "..." : `${dashboardData.completionRate}%`}
            subtitle="Overall learning progress estimate"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm min-h-[400px]">
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
              {loading ? (
                // Skeletons
                [1, 2].map((i) => <ModuleSkeleton key={i} />)
              ) : dashboardData.enrolledModules.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                    <HugeiconsIcon
                      icon={BookOpen01Icon}
                      className="w-8 h-8 text-gray-400"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    No Modules Enrolled
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm mb-6">
                    You haven't enrolled in any disaster preparedness modules
                    yet. Head over to the catalog to get started!
                  </p>
                  <button
                    onClick={() => navigate("/user/catalog")}
                    className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700 transition"
                  >
                    Explore Catalog
                  </button>
                </div>
              ) : (
                // Real Data
                dashboardData.enrolledModules.map((module) => (
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

                      <div className="min-w-52 flex-shrink-0">
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
                        <button
                          onClick={() => navigate("/user/modules")}
                          className="mt-4 w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition cursor-pointer"
                        >
                          Resume Module
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm h-fit">
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
              {loading ? (
                // Skeletons
                [1, 2, 3].map((i) => <AnnouncementSkeleton key={i} />)
              ) : dashboardData.announcements.length === 0 ? (
                <div className="text-center py-6">
                  <HugeiconsIcon
                    icon={AlertCircleIcon}
                    className="w-8 h-8 text-gray-300 mx-auto mb-2"
                  />
                  <p className="text-sm text-gray-500">
                    No new announcements at this time.
                  </p>
                </div>
              ) : (
                dashboardData.announcements.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate("/user/announcements")}
                    className="rounded-2xl bg-gray-50 p-4 hover:bg-gray-100 transition cursor-pointer border border-transparent hover:border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                        {item.date}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {item.author}
                      </p>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {item.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {!loading && dashboardData.announcements.length > 0 && (
              <button
                onClick={() => navigate("/user/announcements")}
                className="w-full mt-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                View All Announcements
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
