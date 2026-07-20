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
        {displayData.certificates && displayData.certificates.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-6 h-6 text-blue-700" />
              Your Earned Certificates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayData.certificates.map(cert => (
                <div key={cert.verification_token} className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">{cert.cert_rec}</span>
                    {cert.status === 'expired' && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-[10px] rounded-full font-bold uppercase">Expired</span>
                    )}
                    {cert.status === 'revoked' && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-[10px] rounded-full font-bold uppercase">Revoked</span>
                    )}
                  </div>
                  <h3 className={`font-bold text-sm mb-1 truncate ${cert.status === 'revoked' ? 'text-gray-400 line-through' : 'text-gray-900'}`} title={cert.module_title}>
                     {cert.module_title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">Earned: {new Date(cert.completion_date).toLocaleDateString()}</p>
                  
                  {cert.status === 'revoked' ? (
                    <button disabled className="mt-auto w-full py-2 bg-gray-100 text-gray-400 text-sm font-bold rounded-lg text-center cursor-not-allowed">
                      Unavailable
                    </button>
                  ) : (
                    <Link
                      to={`/user/certTemplate?token=${cert.verification_token}`}
                      className="mt-auto w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg text-center transition-colors"
                    >
                      View Certificate
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
