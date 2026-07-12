import { memo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Megaphone01Icon, Calendar01Icon, UserCircleIcon } from '@hugeicons/core-free-icons';

const AnnouncementCard = memo(function AnnouncementCard({ item }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex gap-5">
        {/* Icon Container */}
        <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 ring-4 ring-white shadow-sm transition-transform duration-300 group-hover:scale-110">
          <HugeiconsIcon icon={Megaphone01Icon} className="h-6 w-6" />
        </div>
        
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 leading-tight group-hover:text-red-700 transition-colors">
                {item.title}
              </h2>
              
              {/* Metadata row */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-gray-500">
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={UserCircleIcon} className="h-4 w-4 text-gray-400" />
                  <span>{item.author || "Bacolor Admin"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Calendar01Icon} className="h-4 w-4 text-gray-400" />
                  <span>{item.date}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-sm leading-relaxed text-gray-600">
            {item.content}
          </div>
        </div>
      </div>
    </div>
  );
});

export default AnnouncementCard;