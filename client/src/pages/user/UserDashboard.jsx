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
import AnnouncementCard from "../../components/ui/announcements/AnnouncementCard.jsx";
import StatCard from "../../components/ui/dashboard/StatCard.jsx";
import ModuleSkeleton from "../../components/ui/modules/ModuleSkeleton.jsx";
import AnnouncementSkeleton from "../../components/ui/announcements/AnnouncementSkeleton.jsx";
import WelcomeModal from "../../components/ui/modals/WelcomeModal.jsx";
import WelcomeBanner from "../../components/ui/dashboard/WelcomeBanner.jsx";
import EnrolledModuleCard from "../../components/ui/modules/EnrolledModuleCard.jsx";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import toast from "react-hot-toast";

export default function UserDashboard() {
  useDocumentTitle("Dashboard | Bacolor LMS");
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

  return (
    <div className="animate-in fade-in duration-300 relative">
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        userName={currentUser.name}
        onGoToCatalog={() => {
          setShowWelcomeModal(false);
          navigate("/user/catalog");
        }}
      />

      <div className="space-y-8">
        <WelcomeBanner
          userName={currentUser.name}
          onBrowse={() => navigate("/user/catalog")}
          onContinue={() => navigate("/user/modules")}
        />

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
                dashboardData.enrolledModules.map((module) => (
                  <EnrolledModuleCard
                    key={module.id}
                    module={module}
                    onResume={() => navigate("/user/modules")}
                  />
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
