import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Activity01Icon, Alert01Icon, Book01Icon } from "@hugeicons/core-free-icons";
import { useModuleEnrollment } from "../../../hooks/useModuleEnrollment";
import Spinner from "../../ui/Spinner";

const getCategoryIcon = (category) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("flood") || cat.includes("water")) return Activity01Icon;
  if (cat.includes("earthquake") || cat.includes("seismic")) return Alert01Icon;
  return Book01Icon;
};

const ModuleCard = memo(function ModuleCard({
  module,
  enrolled = false,
  onEnrollSuccess,
}) {
  const navigate = useNavigate();
  
  // Extract complex logic into custom hook
  const { localEnrolled, isEnrolling, handleEnroll } = useModuleEnrollment({
    moduleId: module.id,
    moduleTitle: module.title,
    initialEnrolled: enrolled,
    onEnrollSuccess
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col sm:flex-row gap-5 group">
      
      {/* Thumbnail */}
      <div className="hidden sm:block w-32 h-full shrink-0 overflow-hidden rounded-xl bg-gray-100 relative min-h-[140px]">
        <img
          loading="lazy"
          src={module.image_url || "https://images.unsplash.com/photo-1596489370806-53c847d0de05?q=80&w=600&auto=format&fit=crop"}
          alt={module.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* Card Content */}
      <div className="flex-1 flex flex-col">
        <div className="mb-3 flex flex-wrap gap-2 items-center">
          <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 border border-red-100">
            <HugeiconsIcon icon={getCategoryIcon(module.category)} className="w-3.5 h-3.5" />
            {module.category}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 border border-gray-200">
            {module.level}
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-100">
            {module.duration}
          </span>
        </div>

        <h2 className="text-xl font-bold text-gray-900 group-hover:text-red-700 transition-colors">
          {module.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 line-clamp-2 flex-1">
          {module.description}
        </p>

        {/* Progress Bar (Only visible if enrolled) */}
        {localEnrolled && (
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-gray-500">Progress</span>
              <span className="font-bold text-gray-900">{module.progress || 0}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-red-600 transition-all duration-500 ease-out"
                style={{ width: `${module.progress || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          {localEnrolled ? (
            <button 
              onClick={() => navigate(`/user/modules/${module.id}`)}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition cursor-pointer"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleEnroll}
              disabled={isEnrolling}
              className={`rounded-xl px-5 py-3 text-sm font-bold text-white transition flex items-center justify-center gap-2 ${
                isEnrolling ? "bg-gray-400 cursor-not-allowed" : "bg-gray-900 hover:bg-black cursor-pointer"
              }`}
            >
              {isEnrolling ? (
                <><Spinner /> Enrolling...</>
              ) : (
                "Enroll Now"
              )}
            </button>
          )}

          <button className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
});

export default ModuleCard;
