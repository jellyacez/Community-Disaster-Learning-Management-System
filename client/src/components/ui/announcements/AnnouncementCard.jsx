import { memo } from 'react';

const AnnouncementCard = memo(function AnnouncementCard({ item }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">{item.title}</h2>
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
          {item.date}
        </span>
      </div>
      <p className="text-gray-600">{item.content}</p>
    </div>
  );
});

export default AnnouncementCard;