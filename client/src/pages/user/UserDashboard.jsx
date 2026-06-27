// --- START: UserDashboard.jsx ---
import React, { useState, useEffect } from "react";
import { useOutletContext, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "../../lib/auth-client";
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
import WelcomeModal from "../../components/ui/modals/WelcomeModal.jsx";
import WelcomeBanner from "../../components/ui/dashboard/WelcomeBanner.jsx";
import DashboardStats from "../../components/ui/dashboard/DashboardStats.jsx";
import DashboardEnrolledList from "../../components/ui/dashboard/DashboardEnrolledList.jsx";
import DashboardAnnouncementsList from "../../components/ui/dashboard/DashboardAnnouncementsList.jsx";
import DashboardEmergencyContacts from "../../components/ui/dashboard/DashboardEmergencyContacts.jsx";

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
  const { data: session } = authClient.useSession();

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
    if (location.state?.showWelcome || location.state?.fromLogin) {
      setShowWelcomeModal(true);
      sessionStorage.setItem("hasSeenWelcome", "true");
      navigate(location.pathname, { replace: true, state: {} });
    }

    if (session?.user?.createdAt) {
      const accountAgeMs = Date.now() - new Date(session.user.createdAt).getTime();
      const isNewAccount = accountAgeMs < 60000;
      const hasSeenWelcome = sessionStorage.getItem("hasSeenWelcome");

      if (isNewAccount && !hasSeenWelcome) {
        setShowWelcomeModal(true);
        sessionStorage.setItem("hasSeenWelcome", "true");
      }
    }
  }, [location, navigate, session]);

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
