// --- START: UserDashboard.jsx ---
import { useState, useEffect, useCallback } from "react";
import { useOutletContext, useLocation, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import { authClient } from "../../lib/auth-client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkBadge01Icon,
} from "@hugeicons/core-free-icons";
import WelcomeModal from "../../components/ui/modals/WelcomeModal.jsx";
import WelcomeBanner from "../../components/ui/dashboard/WelcomeBanner.jsx";
import DashboardStats from "../../components/ui/dashboard/DashboardStats.jsx";
import DashboardEnrolledList from "../../components/ui/dashboard/DashboardEnrolledList.jsx";
import DashboardAnnouncementsList from "../../components/ui/dashboard/DashboardAnnouncementsList.jsx";
import DashboardEmergencyContacts from "../../components/ui/dashboard/DashboardEmergencyContacts.jsx";

import useDocumentTitle from "../../hooks/useDocumentTitle";
import toast from "react-hot-toast";
import OnboardingModal from "../../components/ui/modals/OnboardingModal.jsx";

export default function UserDashboard() {
  useDocumentTitle("Dashboard | Bacolor LMS");
  const { currentUser } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const { data: session } = authClient.useSession();

  const {
    data: dashboardData,
    isLoading: loading,
  } = useQuery({
    queryKey: ["userDashboard"],
    queryFn: async () => {
      const response = await apiClient.get('/user/dashboard');
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

  const displayData = {
    totalModules: rawData.totalModules || 0,
    announcements: rawData.announcements || [],
    enrolledModules: rawData.enrolledModules || [],
    completionRate: rawData.completionRate || 0,
    certificates: rawData.certificates || [],
  };

  useEffect(() => {
    if (location.state?.showWelcome || location.state?.fromLogin) {
      setTimeout(() => setShowWelcomeModal(true), 0);
      sessionStorage.setItem("hasSeenWelcome", "true");
      navigate(location.pathname, { replace: true, state: {} });
    }

    if (session?.user?.createdAt) {
      const accountAgeMs = Date.now() - new Date(session.user.createdAt).getTime();
      const isNewAccount = accountAgeMs < 60000;
      const hasSeenWelcome = sessionStorage.getItem("hasSeenWelcome");

      if (isNewAccount && !hasSeenWelcome) {
        setTimeout(() => setShowWelcomeModal(true), 0);
        sessionStorage.setItem("hasSeenWelcome", "true");
      }
    }
  }, [location, navigate, session]);

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
          onContinue={() => navigate("/user/enrolled")}
        />
        <DashboardStats displayData={displayData} loading={loading} />

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
          </div>
        </section>
      </div>
    </div>
  );
}
// --- END: UserDashboard.jsx ---
