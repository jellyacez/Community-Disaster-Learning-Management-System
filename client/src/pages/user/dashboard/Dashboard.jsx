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
import {
  InformationCircleIcon,
  AlertCircleIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Megaphone01Icon,
} from "@hugeicons/core-free-icons";

/**
 * Helper: Separates Urgent and Standard announcements,
 * assigns independent sequential numbers (1, 2, 3...) per group,
 * and positions all Urgent announcements in the front slots.
 */
function organizeAnnouncements(rawList = []) {
  const urgentList = [];
  const standardList = [];

  rawList.forEach((item) => {
    if (!item) return;
    const priority = String(item.priority || "").trim().toLowerCase();
    if (priority === "urgent") {
      urgentList.push(item);
    } else {
      standardList.push(item);
    }
  });

  const sortByDate = (a, b) => {
    const dA = new Date(a.date || a.created_at || a.createdAt || 0);
    const dB = new Date(b.date || b.created_at || b.createdAt || 0);
    return dA - dB;
  };

  urgentList.sort(sortByDate);
  standardList.sort(sortByDate);

  const sequencedUrgent = urgentList.map((item, idx) => ({
    ...item,
    seq: item.advisory_number || idx + 1,
    isUrgent: true,
  }));

  const sequencedStandard = standardList.map((item, idx) => ({
    ...item,
    seq: item.advisory_number || idx + 1,
    isUrgent: false,
  }));

  return [...sequencedUrgent, ...sequencedStandard];
}

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

  // 2. Dedicated Query to pull announcements (Fetch enough so standard items aren't truncated)
  const {
    data: announcementsData,
    isLoading: announcementsLoading,
  } = useQuery({
    queryKey: ["latestAnnouncements"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/users/announcements?limit=20");
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

  // Organize into Urgent-first array with independent sequencing
  const sortedAnnouncements = useMemo(() => {
    return organizeAnnouncements(resolvedAnnouncements);
  }, [resolvedAnnouncements]);

  // Reset slider index if the announcement list changes or shrinks
  useEffect(() => {
    setCurrentSlide(0);
    setIsTransitioning(false);
  }, [sortedAnnouncements.length]);

  const displayData = useMemo(() => ({
    totalModules: rawData.totalModules || 0,
    announcements: sortedAnnouncements,
    enrolledModules: rawData.enrolledModules || [],
    completionRate: rawData.completionRate || 0,
    certificates: rawData.certificates || [],
  }), [rawData, sortedAnnouncements]);

  const activeModules = useMemo(
    () => displayData.enrolledModules.filter((m) => m.progress < 100),
    [displayData.enrolledModules],
  );
  const topActiveModule = activeModules[0];

  // Clone first item to the end for seamless loop
  const carouselItems = useMemo(() => {
    if (sortedAnnouncements.length <= 1) return sortedAnnouncements;
    return [...sortedAnnouncements, sortedAnnouncements[0]];
  }, [sortedAnnouncements]);

  // Advance forward (right-to-left)
  const handleNextSlide = useCallback(() => {
    if (sortedAnnouncements.length <= 1) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => prev + 1);
  }, [sortedAnnouncements.length]);

  // Advance backward (left-to-right)
  const handlePrevSlide = useCallback(() => {
    if (sortedAnnouncements.length <= 1) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev === 0 ? sortedAnnouncements.length - 1 : prev - 1));
  }, [sortedAnnouncements.length]);

  // Reset silently from clone to index 0 after transition ends
  const handleTransitionEnd = () => {
    if (currentSlide >= sortedAnnouncements.length) {
      setIsTransitioning(false);
      setCurrentSlide(0);
    }
  };

  // Auto-play interval: Advances every 5 seconds
  useEffect(() => {
    if (sortedAnnouncements.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      handleNextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [sortedAnnouncements.length, isPaused, handleNextSlide]);

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
          {/* TOP SECTION: Seamless Announcement Slider with Controls */}
          {announcementsLoading ? (
            <div className="h-28 animate-pulse bg-white/10 rounded-xl" />
          ) : sortedAnnouncements.length > 0 ? (
            <div className="w-full overflow-hidden">
              {/* Carousel Track Viewport */}
              <div className="relative w-full overflow-hidden min-h-[105px]">
                <div
                  onTransitionEnd={handleTransitionEnd}
                  className={`flex w-full ${
                    isTransitioning
                      ? "transition-transform duration-700 ease-in-out"
                      : "transition-none"
                  }`}
                  style={{
                    transform: `translateX(-${currentSlide * 100}%)`,
                  }}
                >
                  {carouselItems.map((item, index) => {
                    const rawTitle = item.title || item.headline || item.subject || "Notice";
                    const itemTitle = rawTitle.replace(/^Advisory\s*\d*[:\-]?\s*/i, "");
                    const itemContent = item.content || item.description || item.body || "";
                    const itemDate = item.created_at || item.createdAt || item.date;

                    // 48-Hour Recency Check for the "New" indicator
                    const postTime = new Date(itemDate || Date.now()).getTime();
                    const isNew = (Date.now() - postTime) / (1000 * 60 * 60) <= 48;
                    const isUrgent = item.isUrgent || item.priority === "urgent";

                    return (
                      <div
                        key={`${item.id || itemTitle}-${index}`}
                        onClick={() => navigate("/user/announcements")}
                        className="w-full min-w-full max-w-full basis-full shrink-0 overflow-hidden cursor-pointer flex flex-col justify-center space-y-1.5 text-left group box-border pr-2"
                      >
                        {/* Top Advisory Pill Header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {isUrgent ? (
                            /* Urgent Advisory Pill */
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/25 backdrop-blur-md px-3.5 py-1 text-xs font-black tracking-wide text-amber-300 border border-amber-400/40 shadow-xs shrink-0">
                              <HugeiconsIcon icon={AlertCircleIcon} className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                              <span>URGENT ADVISORY #{item.seq}</span>
                              {isNew && (
                                <>
                                  <span className="text-amber-400/60">•</span>
                                  <span className="inline-flex items-center gap-1 text-white font-bold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-ping" />
                                    New
                                  </span>
                                </>
                              )}
                            </span>
                          ) : (
                            /* Standard Advisory Pill */
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white border border-white/15 shadow-xs shrink-0">
                              <HugeiconsIcon icon={Megaphone01Icon} className="w-3.5 h-3.5 text-red-200 shrink-0" />
                              <span>Advisory #{item.seq}</span>
                              {isNew && (
                                <>
                                  <span className="text-white/40">•</span>
                                  <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    New
                                  </span>
                                </>
                              )}
                            </span>
                          )}

                          {/* Date Stamp */}
                          {itemDate && (
                            <span className="text-xs font-medium text-red-100/90 whitespace-nowrap">
                              • {new Date(itemDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          )}
                        </div>

                        {/* Title: truncated to single line with break-words */}
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white truncate group-hover:underline w-full">
                          {itemTitle}
                        </h2>

                        {/* Content: clamped to 2 lines */}
                        {itemContent ? (
                          <p className="text-xs sm:text-sm text-red-100 line-clamp-2 max-w-4xl leading-relaxed break-words">
                            {itemContent}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Slider Controls: Left/Right Arrow Buttons, Dots in Middle, and View All */}
              <div className="relative flex items-center justify-between pt-3 gap-2">
                {/* Left/Right Navigation Arrows */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevSlide();
                    }}
                    disabled={sortedAnnouncements.length <= 1}
                    className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    aria-label="Previous announcement"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextSlide();
                    }}
                    disabled={sortedAnnouncements.length <= 1}
                    className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    aria-label="Next announcement"
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
                  </button>
                </div>

                {/* Centered Pagination Dots */}
                {sortedAnnouncements.length > 1 ? (
                  <div className="flex items-center justify-center gap-1.5 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                    {sortedAnnouncements.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setIsTransitioning(true);
                          setCurrentSlide(index);
                        }}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          index === (currentSlide % sortedAnnouncements.length)
                            ? "w-6 bg-white"
                            : "w-1.5 bg-white/40 hover:bg-white/70"
                        }`}
                        aria-label={`Announcement slide ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : <div />}

                {/* View All Link */}
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