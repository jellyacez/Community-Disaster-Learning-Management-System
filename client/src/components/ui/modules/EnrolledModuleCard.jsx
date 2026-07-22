import DOMPurify from "dompurify";
import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Activity01Icon, Alert01Icon, Book01Icon } from "@hugeicons/core-free-icons";

// Helper for category icons
const getCategoryIcon = (category) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("flood") || cat.includes("water")) return Activity01Icon;
  if (cat.includes("earthquake") || cat.includes("seismic")) return Alert01Icon;
  return Book01Icon; // default icon
};

const EnrolledModuleCard = memo(function EnrolledModuleCard({ module, onResume }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4 hover:border-red-200 hover:shadow-md transition-all duration-300 cursor-pointer bg-white group flex flex-col sm:flex-row gap-5">
      {/* Thumbnail */}
      <div className="hidden sm:block w-28 h-full shrink-0 overflow-hidden rounded-xl bg-gray-100 relative min-h-[130px]">
        {module.image_url ? (
          <img 
            loading="lazy"
            src={module.image_url} 
            alt={module.title} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 absolute inset-0"
          />
        ) : (
          <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center transition-transform duration-700 group-hover:scale-110 text-gray-400">
            <HugeiconsIcon icon={getCategoryIcon(module.category)} className="w-10 h-10 mb-1.5 opacity-40" />
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">
              No Cover
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>

      <div className="flex-1 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap gap-2 items-center">
            <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 border border-red-100">
              <HugeiconsIcon icon={getCategoryIcon(module.category)} className="w-3.5 h-3.5" />
              {module.category}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 border border-gray-200">
              {module.level}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-700 transition-colors">
            {module.title}
          </h3>
          <div 
            className="mt-1 text-sm text-gray-500 line-clamp-2 prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(module.description || "") }}
          />
        </div>

        <div className="min-w-52 shrink-0">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-500">
              Progress
            </span>
            <span className="font-bold text-gray-900">
              {module.progress}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-red-600"
              style={{ width: `${module.progress}%` }}
            />
          </div>
          <button
            onClick={() => onResume(module.id)}
            className="mt-4 w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition cursor-pointer"
          >
            Resume Module
          </button>
        </div>
      </div>
    </div>
  );
});

export default EnrolledModuleCard;
