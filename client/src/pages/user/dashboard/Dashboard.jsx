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
    <div className="animate-in fade-in duration-300 relative w-full max-w-full">
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

      <div className="space-y-6 sm:space-y-8">
      {/* =========================================================================
                HERO PORTION: Announcements on Top, Welcome Remarks on Bottom
                ========================================================================= */}
            <div
              className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/[0.06] shadow-sm dark:shadow-none p-[clamp(1rem,2vw+0.5rem,2rem)] space-y-[clamp(1rem,1.5vw,1.5rem)]"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {announcementsLoading ? (
                <div className="h-28 sm:h-32 animate-pulse bg-neutral-100 dark:bg-slate-800 rounded-2xl" />
              ) : sortedAnnouncements.length > 0 ? (
                <div className="w-full overflow-hidden">
                  {/* Carousel Track Viewport */}
                  <div className="relative w-full overflow-hidden min-h-[110px] sm:min-h-[120px]">
                    <div
                      onTransitionEnd={handleTransitionEnd}
                      className={`flex w-full ${
                        isTransitioning
                          ? "transition-transform duration-700 ease-in-out"
                          : "transition-none"
                      }`}
                      style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                      {carouselItems.map((item, index) => {
                        const rawTitle = item.title || item.headline || item.subject || "Notice";
                        const itemTitle = rawTitle.replace(/^Advisory\s*\d*[:\-]?\s*/i, "");
                        const itemContent = item.content || item.description || item.body || "";
                        const itemDate = item.created_at || item.createdAt || item.date;

                        const postTime = new Date(itemDate || Date.now()).getTime();
                        const isNew = (Date.now() - postTime) / (1000 * 60 * 60) <= 48;
                        const isUrgent = item.isUrgent || item.priority === "urgent";

                        return (
                          <div
                            key={`${item.id || itemTitle}-${index}`}
                            onClick={() => navigate("/user/announcements")}
                            className={`w-full min-w-full max-w-full basis-full shrink-0 overflow-hidden cursor-pointer flex gap-3 sm:gap-4 group box-border pr-1 sm:pr-3 pl-3 sm:pl-4 border-l-4 ${
                              isUrgent
                                ? "border-amber-500"
                                : "border-red-500"
                            }`}
                          >
                            <div className="flex flex-col justify-center space-y-2 text-left w-full">
                              {/* Top Advisory Pill Header */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {isUrgent ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-bold tracking-wide text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 shrink-0">
                                    <HugeiconsIcon icon={AlertCircleIcon} className="w-3.5 h-3.5 shrink-0" />
                                    <span>URGENT ADVISORY #{item.seq}</span>
                                    {isNew && (
                                      <>
                                        <span className="text-amber-400 select-none">•</span>
                                        <span className="inline-flex items-center gap-1 font-bold">
                                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                                          New
                                        </span>
                                      </>
                                    )}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-500/10 px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-semibold text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30 shrink-0">
                                    <HugeiconsIcon icon={Megaphone01Icon} className="w-3.5 h-3.5 shrink-0" />
                                    <span>Advisory #{item.seq}</span>
                                    {isNew && (
                                      <>
                                        <span className="text-neutral-300 dark:text-neutral-600 select-none">•</span>
                                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                          New
                                        </span>
                                      </>
                                    )}
                                  </span>
                                )}

                                {itemDate && (
                                  <span className="text-[11px] sm:text-xs font-medium text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                                    • {new Date(itemDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </span>
                                )}
                              </div>

                              {/* Title */}
                              <h2 className="text-[clamp(1.125rem,1.2vw+0.9rem,1.875rem)] font-extrabold tracking-tight text-neutral-900 dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors w-full leading-snug">
                                {itemTitle}
                              </h2>

                              {/* Content */}
                              {itemContent ? (
                                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 max-w-4xl leading-relaxed break-words">
                                  {itemContent}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slider Controls */}
                  <div className="relative flex flex-wrap sm:flex-nowrap items-center justify-between pt-3 gap-2.5">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handlePrevSlide(); }}
                        disabled={sortedAnnouncements.length <= 1}
                        className="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
                        aria-label="Previous announcement"
                      >
                        <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleNextSlide(); }}
                        disabled={sortedAnnouncements.length <= 1}
                        className="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
                        aria-label="Next announcement"
                      >
                        <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
                      </button>
                    </div>

                    {sortedAnnouncements.length > 1 ? (
                      <div className="order-3 sm:order-2 flex items-center justify-center gap-1.5 w-full sm:w-auto sm:absolute sm:left-1/2 sm:-translate-x-1/2 py-1">
                        {sortedAnnouncements.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => { setIsTransitioning(true); setCurrentSlide(index); }}
                            className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                              index === (currentSlide % sortedAnnouncements.length)
                                ? "w-6 bg-red-500"
                                : "w-1.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-600"
                            }`}
                            aria-label={`Announcement slide ${index + 1}`}
                          />
                        ))}
                      </div>
                    ) : <div className="order-2" />}

                    <div className="order-2 sm:order-3 flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate("/user/announcements")}
                        className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer py-1"
                      >
                        View All &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* BOTTOM SECTION: Welcome Remarks & Action Button */}
              <div className="pt-[clamp(1rem,1.5vw,1.25rem)] border-t border-neutral-100 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center">
                    <span className="inline-block rounded-full bg-neutral-100 dark:bg-white/[0.06] px-3 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
                      Welcome back, {currentUser?.name || "Resident"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed">
                    Continue your disaster preparedness training, stay updated with municipal announcements, and track your learning progress in one place.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={activeModules.length > 0 ? () => topActiveModule && handleResume(topActiveModule.id) : () => navigate("/user/modules")}
                  className="w-full sm:w-auto shrink-0 rounded-xl bg-red-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer text-center"
                >
                  {activeModules.length > 0 ? "Resume Module" : "Browse Modules"}
                </button>
              </div>
            </div>

        {/* Dashboard Stats */}
        <DashboardStats displayData={displayData} loading={loading} navigate={navigate} />

        {/* Lower Main Content Section */}
        <section className="grid gap-6 lg:grid-cols-3 items-start">
          <div className="lg:col-span-2 min-w-0">
            <DashboardEnrolledList
              displayData={displayData}
              loading={loading}
              navigate={navigate}
              handleResume={handleResume}
            />
          </div>

          {/* Lower Right Column: Emergency Contacts & Support */}
          <div className="space-y-6 lg:sticky lg:top-24 self-start min-w-0">
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
              className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center justify-between hover:border-gray-300 dark:hover:border-slate-700 hover:shadow-md active:scale-[0.99] transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 outline-hidden"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <HugeiconsIcon icon={InformationCircleIcon} className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                    MDRRMO Help Desk & Support
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                    Submit inquiries & LMS feedback
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 shrink-0 whitespace-nowrap">
                Contact &rarr;
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
