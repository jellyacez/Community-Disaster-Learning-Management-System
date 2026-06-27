// --- START: UserDashboard.jsx ---
import React, { useState, useEffect } from "react";
import { useOutletContext, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import { SkeletonText } from "../../components/ui/Skeleton.jsx";
import OnboardingModal from "../../components/ui/modals/OnboardingModal.jsx";

export default function UserDashboard() {
  useDocumentTitle("Dashboard | Bacolor LMS");
  const { currentUser } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Data fetching
  const {
    data: dashboardData,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["userDashboard"],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/user/dashboard`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      return response.json();
    },
    onError: (err) => {
      console.error("Error fetching dashboard data:", err);
      toast.error("Failed to load dashboard data");
    },
  });

  const displayData = dashboardData || {
    totalModules: 0,
    announcements: [],
    enrolledModules: [],
    completionRate: 0,
  };

  useEffect(() => {
    // Navigation side effects
    if (location.state?.fromLogin) {
      setShowWelcomeModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleResume = React.useCallback(
    (moduleId) => {
      navigate(`/user/modules/${moduleId}`);
    },
    [navigate],
  );

  return (
    <div className="animate-in fade-in duration-300 relative">
      <OnboardingModal currentUser={currentUser} />

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
          onBrowse={() => navigate("/user/modules")}
          onContinue={() => navigate("/user/enrolled")}
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Available Modules"
            value={
              loading ? (
                <SkeletonText className="h-8 w-16" />
              ) : (
                displayData.totalModules
              )
            }
            subtitle="Training modules ready for access"
          />
          <StatCard
            title="Enrolled Modules"
            value={
              loading ? (
                <SkeletonText className="h-8 w-16" />
              ) : (
                displayData.enrolledModules.length
              )
            }
            subtitle="Modules currently in progress"
          />
          <StatCard
            title="Announcements"
            value={
              loading ? (
                <SkeletonText className="h-8 w-16" />
              ) : (
                displayData.announcements.length
              )
            }
            subtitle="Latest updates from the system"
          />
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-sm font-medium text-gray-500">Completion Rate</p>
              <h3 className="mt-2 text-3xl font-extrabold text-gray-900">{loading ? '...' : `${displayData.completionRate}%`}</h3>
              <p className="mt-1 text-xs text-gray-400">Overall learning progress estimate</p>
            </div>
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle className="text-gray-100" strokeWidth="4" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
                  <circle 
                    className="text-red-500 transition-all duration-1000 ease-out" 
                    strokeWidth="4" 
                    strokeDasharray={100.53} 
                    strokeDashoffset={loading ? 100.53 : 100.53 - ((displayData.completionRate||0)/100)*100.53} 
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="16" cx="18" cy="18" 
                  />
                </svg>
            </div>
          </div>
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
              ) : displayData.enrolledModules.length === 0 ? (
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
                displayData.enrolledModules.map((module) => (
                  <EnrolledModuleCard
                    key={module.id}
                    module={module}
                    onResume={handleResume}
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
              ) : displayData.announcements.length === 0 ? (
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
                displayData.announcements.map((item) => (
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

            {!loading && displayData.announcements.length > 0 && (
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
// --- END: UserDashboard.jsx ---
