// --- START: UserDashboard.jsx ---
import { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";
import { authClient } from "../../../lib/auth-client";

import WelcomeModal from "../../../components/ui/modals/WelcomeModal.jsx";
import WelcomeBanner from "../../../components/ui/dashboard/WelcomeBanner.jsx";
import DashboardStats from "../../../components/ui/dashboard/DashboardStats.jsx";
import DashboardEnrolledList from "../../../components/ui/dashboard/DashboardEnrolledList.jsx";
import DashboardAnnouncementsList from "../../../components/ui/dashboard/DashboardAnnouncementsList.jsx";
import DashboardEmergencyContacts from "../../../components/ui/dashboard/DashboardEmergencyContacts.jsx";

import useDocumentTitle from "../../../hooks/useDocumentTitle";
import toast from "react-hot-toast";
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

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ["userDashboard"],
    queryFn: async () => {
      const response = await apiClient.get("/user/dashboard");
      // Return raw response.data to handle both old and new backend shapes gracefully
      return response.data;
    },
    onError: (err) => {
      console.error("Error fetching dashboard data:", err);
      toast.error("Failed to load dashboard data");
    },
  });

  // Defensively handle React Query HMR cache poisoning
  // (where the old { success, data } object might still be cached)
  const rawData = dashboardData?.enrolledModules
    ? dashboardData
    : dashboardData?.data?.enrolledModules
      ? dashboardData.data
      : {};

  const displayData = useMemo(() => ({
    totalModules: rawData.totalModules || 0,
    announcements: rawData.announcements || [],
    enrolledModules: rawData.enrolledModules || [],
    completionRate: rawData.completionRate || 0,
    certificates: rawData.certificates || [],
  }), [rawData]);

  const activeModules = useMemo(
    () => displayData.enrolledModules.filter((m) => m.progress < 100),
    [displayData.enrolledModules],
  );
  const topActiveModule = activeModules[0];

  useEffect(() => {
    // Wait for the user to finish onboarding before showing WelcomeModal.
    // If they don't have a barangay_id, OnboardingModal is active.
    if (!currentUser || !currentUser.barangay_id) return;

    // Case 1: Email/password registration — flag set in useRegisterForm on success.
    if (sessionStorage.getItem("newlyRegistered") === "true") {
      setTimeout(() => setShowWelcomeModal(true), 0);
      sessionStorage.removeItem("newlyRegistered");
      sessionStorage.setItem("hasSeenWelcome", "true");
      return;
    }

    // Case 2: Explicit navigation state (e.g. passed from login page).
    if (location.state?.showWelcome || location.state?.fromLogin) {
      setTimeout(() => setShowWelcomeModal(true), 0);
      sessionStorage.setItem("hasSeenWelcome", "true");
      navigate(location.pathname, { replace: true, state: {} });
    }

    // Case 3: New account fallback — e.g. Google OAuth, account < 10 minutes old.
    if (session?.user?.createdAt) {
      const accountAgeMs =
        Date.now() - new Date(session.user.createdAt).getTime();
      const isNewAccount = accountAgeMs < 600000; // 10 minutes
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
        userName={currentUser.name}
        onGoToCatalog={() => {
          setShowWelcomeModal(false);
          navigate("/user/modules");
        }}
      />

      <div className="space-y-8">
        <WelcomeBanner
          userName={currentUser.name}
          onBrowse={() => navigate("/user/modules")}
          onResume={() => topActiveModule && handleResume(topActiveModule.id)}
          hasActiveModules={activeModules.length > 0}
        />
        <DashboardStats displayData={displayData} loading={loading} navigate={navigate} />

        <section className="grid gap-6 lg:grid-cols-3">
          <DashboardEnrolledList
            displayData={displayData}
            loading={loading}
            navigate={navigate}
            handleResume={handleResume}
          />

          <div className="space-y-6 sticky top-24 self-start">
            <DashboardAnnouncementsList
              displayData={displayData}
              loading={loading}
              navigate={navigate}
            />

            <DashboardEmergencyContacts />

            {/* Persistent Support Desk Link */}
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
