// --- START: UserProfile.jsx ---
import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import ProfileAvatar from "../../components/ui/profile/ProfileAvatar";
import AccountDetails from "../../components/ui/profile/AccountDetails";
import StatsOverview from "../../components/ui/profile/StatsOverview";
import BadgesSection from "../../components/ui/profile/BadgesSection";
import ActivityTimeline from "../../components/ui/profile/ActivityTimeline";

export default function UserProfile() {
  useDocumentTitle("User Profile | Bacolor LMS");

  const { currentUser, userInitials } = useOutletContext();

  // Fetch dashboardData (uses React Query cache to avoid redundant API calls)
  const { data: dashboardData } = useQuery({
    queryKey: ['userDashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/user/dashboard');
      return response.data;
    }
  });

  const enrolledModules = useMemo(() => dashboardData?.enrolledModules || [], [dashboardData?.enrolledModules]);

  // Derived state memoization to prevent expensive calculations on re-renders
  const { totalCompleted, totalHours, activeModules } = useMemo(() => {
    let completed = 0;
    let hours = 0;
    let active = 0;

    enrolledModules.forEach(mod => {
      if (mod.progress === 100) {
        completed += 1;
        
        let time = parseFloat(mod.duration) || 0;
        if (typeof mod.duration === 'string' && mod.duration.toLowerCase().includes('min')) {
          time = time / 60;
        }
        hours += time;

      } else {
        active += 1; 
      }
    });

    return { totalCompleted: completed, totalHours: Math.round(hours * 10) / 10, activeModules: active };
  }, [enrolledModules]);


  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            User Profile
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View your account information and learning identity.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <ProfileAvatar currentUser={currentUser} userInitials={userInitials} />
          <AccountDetails currentUser={currentUser} />
        </div>

        {/* Gamification & Learning Metrics Section */}
        <div className="mt-8 space-y-6">
          <StatsOverview totalCompleted={totalCompleted} totalHours={totalHours} activeModules={activeModules} />
          <div className="grid gap-6 lg:grid-cols-2 items-stretch">
            <ActivityTimeline enrolledModules={enrolledModules} />
            <BadgesSection enrolledModules={enrolledModules} />
          </div>
        </div>
      </div>
    </div>
  );
}
// --- END: UserProfile.jsx ---
