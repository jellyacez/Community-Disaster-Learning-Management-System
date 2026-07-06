// --- START: UserAnnouncements.jsx ---

import { useQuery } from "@tanstack/react-query";
import AnnouncementCard from "../../components/ui/announcements/AnnouncementCard";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function UserAnnouncements() {
  useDocumentTitle("Announcements | Bacolor LMS");

  const { data: dashboardData } = useQuery({
    queryKey: ['userDashboard'],
    queryFn: async () => {
      const { default: apiClient } = await import("../../lib/apiClient");
      const response = await apiClient.get('/user/dashboard');
      return response.data;
    }
  });
  const announcements = dashboardData?.announcements || [];

  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Announcements
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Stay updated with training notices, local schedules, and portal
            updates.
          </p>
        </div>

        <div className="space-y-4">
          {announcements.map((item) => (
            <AnnouncementCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
// --- END: UserAnnouncements.jsx ---
