import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Notification03Icon } from '@hugeicons/core-free-icons';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../lib/apiClient';
import { useNotificationPreferences } from '../settings/hooks/useNotificationPreferences';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Pull settings from DB via our custom hook
  const { settings, updatePreference } = useNotificationPreferences();
  const lastSeenId = settings?.lastSeenAnnouncementId || null;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: dashboardData, isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ["userDashboard"],
    queryFn: async () => {
      const response = await apiClient.get("/user/dashboard");
      // Return raw response.data to handle both old and new backend shapes gracefully
      return response.data;
    },
  });

  // Defensively handle React Query HMR cache poisoning
  const announcements = dashboardData?.announcements 
    ? dashboardData.announcements 
    : dashboardData?.data?.announcements 
      ? dashboardData.data.announcements 
      : [];
  const recentAnnouncements = announcements.slice(0, 3);
  
  // A notification is "new" if the newest announcement ID doesn't match what is stored in DB settings
  const hasUnread = recentAnnouncements.length > 0 && String(recentAnnouncements[0].id) !== String(lastSeenId);

  // When dropdown opens, mark the newest announcement as seen in the DB
  useEffect(() => {
    if (isOpen && recentAnnouncements.length > 0) {
      const topId = String(recentAnnouncements[0].id);
      if (topId !== String(lastSeenId)) {
        updatePreference("lastSeenAnnouncementId", topId);
      }
    }
  }, [isOpen, recentAnnouncements, lastSeenId, updatePreference]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View announcements"
        className="relative rounded-xl border border-gray-200 p-2.5 text-gray-600 hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        <HugeiconsIcon aria-hidden="true" icon={Notification03Icon} className="w-5 h-5" />
        {hasUnread && (
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-white shadow-xl ring-1 ring-black/5 z-50 overflow-hidden flex flex-col"
          >
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {hasUnread && (
                <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  New
                </span>
              )}
            </div>

            <div className="max-h-[320px] overflow-y-auto p-2">
              {isLoadingAnnouncements ? (
                <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
              ) : recentAnnouncements.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No new announcements.</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {recentAnnouncements.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl hover:bg-gray-50 transition-colors flex flex-col gap-1 cursor-default">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-gray-900 line-clamp-1">{item.title}</span>
                        <span className="text-xs text-gray-500 shrink-0 ml-2">
                          {item.date}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{item.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/user/announcements');
              }}
              className="w-full px-4 py-3 text-sm font-bold text-red-600 bg-gray-50 hover:bg-gray-100 transition-colors border-t border-gray-100 focus:outline-none"
            >
              View All Announcements
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
