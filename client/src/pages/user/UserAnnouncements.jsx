import React from "react";
import { useOutletContext } from "react-router-dom";
import AnnouncementCard from './components/AnnouncementCard';
import { announcements } from './userData.js';

export default function UserAnnouncements() {
  const { currentUser } = useOutletContext();

  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Announcements</h1>
          <p className="mt-1 text-sm text-gray-500">
            Stay updated with training notices, local schedules, and portal updates.
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
