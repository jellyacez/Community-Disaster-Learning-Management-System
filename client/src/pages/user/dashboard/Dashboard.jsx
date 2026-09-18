// --- START: UserDashboard.jsx ---
import { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";
import { authClient } from "../../../lib/auth-client";

import WelcomeModal from "../../../components/ui/modals/WelcomeModal.jsx";
import DashboardStats from "../../../components/ui/dashboard/DashboardStats.jsx";
import DashboardEnrolledList from "../../../components/ui/dashboard/DashboardEnrolledList.jsx";
import DashboardEmergencyContacts from "../../../components/ui/dashboard/DashboardEmergencyContacts.jsx";

import useDocumentTitle from "../../../hooks/useDocumentTitle";
import OnboardingModal from "../../../components/ui/modals/OnboardingModal.jsx";

import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";

export default function UserDashboard() {
  useDocumentTitle("Dashboard | Bacolor LMS");
  const { currentUser } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const { data: session } = authClient.useSession();

  // Infinite Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // 1. Fetch Main Dashboard Data
  const {
    data: dashboardData,
    isLoading: loading,
  } = useQuery({
    queryKey: ["userDashboard"],
    queryFn: async () => {
      const response = await apiClient.get("/user/dashboard");
      return response.data;
    },
  });

  // 2. Dedicated Query to pull latest announcements from backend
  const {
    data: announcementsData,
    isLoading: announcementsLoading,
  } = useQuery({
    queryKey: ["latestAnnouncements"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/user/announcements");
        const list = Array.isArray(response.data)
          ? response.data
          : response.data?.announcements || response.data?.data || [];
        return list;
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 2,
  });

  const rawData = dashboardData?.enrolledModules
    ? dashboardData
    : dashboardData?.data?.enrolledModules
      ? dashboardData.data
      : {};

  // Sanitize and filter out null, undefined, or empty announcements
  const resolvedAnnouncements = useMemo(() => {
    const rawList =
      Array.isArray(announcementsData) && announcementsData.length > 0
        ? announcementsData
        : rawData.announcements || [];

    return rawList.filter((item) => {
      if (!item) return false;
      const title = item.title || item.headline || item.subject || "";
      const content = item.content || item.description || item.body || "";
      return String(title).trim().length > 0 || String(content).trim().length > 0;
    });
  }, [announcementsData, rawData.announcements]);

  // Reset slider index if the announcement list changes or shrinks
  useEffect(() => {
    setCurrentSlide(0);
    setIsTransitioning(false);
  }, [resolvedAnnouncements.length]);

  const displayData = useMemo(() => ({
    totalModules: rawData.totalModules || 0,
    announcements: resolvedAnnouncements,
    enrolledModules: rawData.enrolledModules || [],
    completionRate: rawData.completionRate || 0,
    certificates: rawData.certificates || [],
  }), [rawData, resolvedAnnouncements]);

  const activeModules = useMemo(
    () => displayData.enrolledModules.filter((m) => m.progress < 100),
    [displayData.enrolledModules],
  );
  const topActiveModule = activeModules[0];

  // Clone first item to the end for seamless right-to-left loop
  const carouselItems = useMemo(() => {
    if (resolvedAnnouncements.length <= 1) return resolvedAnnouncements;
    return [...resolvedAnnouncements, resolvedAnnouncements[0]];
  }, [resolvedAnnouncements]);

  // Advance strictly right-to-left
  const handleNextSlide = useCallback(() => {
    if (resolvedAnnouncements.length <= 1) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => prev + 1);
  }, [resolvedAnnouncements.length]);

  // Reset silently from clone to index 0 after transition ends
  const handleTransitionEnd = () => {
    if (currentSlide >= resolvedAnnouncements.length) {
      setIsTransitioning(false);
      setCurrentSlide(0);
    }
  };

  // Auto-play interval: Always advances forward (right-to-left)
  useEffect(() => {
    if (resolvedAnnouncements.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      handleNextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [resolvedAnnouncements.length, isPaused, handleNextSlide]);

  useEffect(() => {
    if (!currentUser || !currentUser.barangay_id) return;

    if (sessionStorage.getItem("newlyRegistered") === "true") {
      setTimeout(() => setShowWelcomeModal(true), 0);
      sessionStorage.removeItem("newlyRegistered");
      sessionStorage.setItem("hasSeenWelcome", "true");
      return;
    }

    if (location.state?.showWelcome || location.state?.fromLogin) {
      setTimeout(() => setShowWelcomeModal(true), 0);
      sessionStorage.setItem("hasSeenWelcome", "true");
      navigate(location.pathname, { replace: true, state: {} });
    }

    if (session?.user?.createdAt) {
      const accountAgeMs =
        Date.now() - new Date(session.user.createdAt).getTime();
      const isNewAccount = accountAgeMs < 600000;
      const hasSeenWelcome = sessionStorage.getItem("hasSeenWelcome");

      if (isNewAccount && !hasSeenWelcome) {
        setTimeout(() => setShowWelcomeModal(true), 0);
        sessionStorage.setItem("hasSeenWelcome", "true");
      }
    }
  }, [location, navigate, session, currentUser]);

  const handleResume = useCallback(
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
        userName={currentUser?.name}
        onGoToCatalog={() => {
          setShowWelcomeModal(false);
          navigate("/user/modules");
        }}
      />

      <div className="space-y-8">
        {/* =========================================================================
            HERO PORTION: Announcements on Top, Welcome Remarks on Bottom
           ========================================================================= */}
        <div
          className="relative overflow-hidden rounded-3xl bg-red-600 p-6 sm:p-8 text-white shadow-lg space-y-6"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* TOP SECTION: Seamless Announcement Slider */}
          {announcementsLoading ? (
            <div className="h-20 animate-pulse bg-white/10 rounded-xl" />
          ) : resolvedAnnouncements.length > 0 ? (
            <div>
              <div className="overflow-hidden relative min-h-[90px]">
                <div
                  onTransitionEnd={handleTransitionEnd}
                  className={`flex ${
                    isTransitioning
                      ? "transition-transform duration-700 ease-in-out"
                      : "transition-none"
                  }`}
                  style={{
                    transform: `translateX(-${currentSlide * 100}%)`,
                  }}
                >
                  {carouselItems.map((item, index) => {
                    const itemTitle = item.title || item.headline || item.subject || "Notice";
                    const itemContent = item.content || item.description || item.body || "";
                    const itemDate = item.created_at || item.createdAt || item.date;

                    return (
                      <div
                        key={`${item.id || item._id || itemTitle}-${index}`}
                        onClick={() => navigate("/user/announcements")}
                        className="min-w-full shrink-0 cursor-pointer flex flex-col justify-center space-y-1.5 text-left group"
                      >
                        {/* Date Badge */}
                        <div className="flex items-center">
                          <span className="inline-flex items-center gap-1.5 font-bold text-amber-300 uppercase tracking-wider text-[11px] bg-red-800/60 px-3 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
                            {itemDate
                              ? new Date(itemDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "Announcement"}
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white line-clamp-1 group-hover:underline">
                          {itemTitle}
                        </h2>

                        {/* Content snippet */}
                        {itemContent ? (
                          <p className="text-sm text-red-100 line-clamp-2 max-w-4xl leading-relaxed">
                            {itemContent}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Slider Controls: Dots in Middle & View All on Far Right */}
              <div className="relative flex items-center justify-between pt-4">
                <div className="w-20 hidden sm:block" />

                {/* Centered Dots Indicator */}
                {resolvedAnnouncements.length > 1 ? (
                  <div className="flex items-center justify-center gap-1.5 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                    {resolvedAnnouncements.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setIsTransitioning(true);
                          setCurrentSlide(index);
                        }}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          index === (currentSlide % resolvedAnnouncements.length)
                            ? "w-7 bg-white"
                            : "w-1.5 bg-white/40 hover:bg-white/70"
                        }`}
                        aria-label={`Announcement slide ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : <div />}

                {/* View All on Right */}
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => navigate("/user/announcements")}
                    className="text-xs font-bold text-red-100 hover:text-white transition-colors cursor-pointer"
                  >
                    View All &rarr;
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* BOTTOM SECTION: Welcome Remarks & Action Button */}
          <div className="pt-5 border-t border-red-500/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center">
                <span className="inline-block rounded-full bg-red-800/60 px-3 py-0.5 text-[11px] font-bold tracking-wider uppercase text-red-100">
                  WELCOME BACK, {currentUser?.name || "Resident"}
                </span>
              </div>
              <p className="text-sm text-red-100 max-w-2xl leading-relaxed">
                Continue your disaster preparedness training, stay updated with municipal announcements, and track your learning progress in one place.
              </p>
            </div>

            <button
              type="button"
              onClick={activeModules.length > 0 ? () => topActiveModule && handleResume(topActiveModule.id) : () => navigate("/user/modules")}
              className="self-start sm:self-auto shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-red-600 shadow-sm hover:bg-red-50 transition-colors cursor-pointer"
            >
              {activeModules.length > 0 ? "Resume Module" : "Browse Modules"}
            </button>
          </div>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats displayData={displayData} loading={loading} navigate={navigate} />

        {/* Lower Main Content Section */}
        <section className="grid gap-6 lg:grid-cols-3">
          <DashboardEnrolledList
            displayData={displayData}
            loading={loading}
            navigate={navigate}
            handleResume={handleResume}
          />

          {/* Lower Right Column: Emergency Contacts & Support */}
          <div className="space-y-6 sticky top-24 self-start">
            <DashboardEmergencyContacts />

            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/user/feedback")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/user/feedback");
                }
              }}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 outline-hidden"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <HugeiconsIcon icon={InformationCircleIcon} className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                    MDRRMO Help Desk & Support
                  </h3>
                  <p className="text-xs text-gray-500">
                    Submit inquiries & LMS feedback
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-red-600 group-hover:text-red-700 shrink-0">
                Contact &rarr;
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
// --- END: UserDashboard.jsx ---