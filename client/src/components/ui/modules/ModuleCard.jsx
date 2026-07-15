import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Activity01Icon, Alert01Icon, Book01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { useModuleEnrollment } from "../../../hooks/useModuleEnrollment";
import Spinner from "../../ui/Spinner";
import DOMPurify from "dompurify";
import toast from "react-hot-toast";

const getCategoryIcon = (category) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("flood") || cat.includes("water")) return Activity01Icon;
  if (cat.includes("earthquake") || cat.includes("seismic")) return Alert01Icon;
  return Book01Icon;
};

const getCategoryStyles = (category) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("flood") || cat.includes("water")) return "bg-blue-50 text-blue-700 border-blue-100";
  if (cat.includes("earthquake") || cat.includes("seismic")) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-indigo-50 text-indigo-700 border-indigo-100";
};

const getCategoryIconColor = (category) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("flood") || cat.includes("water")) return "text-blue-600";
  if (cat.includes("earthquake") || cat.includes("seismic")) return "text-amber-600";
  return "text-indigo-600";
};

const ModuleCard = memo(function ModuleCard({
  module,
  enrolled = false,
  isPreview = false,
  isAdminView = false,
  onPreviewClick,
  onEnrollSuccess,
}) {
  const navigate = useNavigate();
  const isCompleted = enrolled && (module.progress === 100 || module.status === "Completed");
  
  // Extract complex logic into custom hook
  const { localEnrolled, isEnrolling, handleEnroll } = useModuleEnrollment({
    moduleId: module.id,
    moduleTitle: module.title,
    initialEnrolled: enrolled,
    onEnrollSuccess
  });

  const handleNavigation = () => {
    if (isPreview && onPreviewClick) return onPreviewClick();
    if (isPreview) return toast.error("Navigation is disabled in Live Preview Mode.");
    navigate(`/user/modules/${module.id}`);
  };

  const handleEnrollClick = () => {
    if (isPreview && onPreviewClick) return onPreviewClick();
    if (isPreview) return toast.error("Enrollment is disabled in Live Preview Mode.");
    handleEnroll();
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col sm:flex-row items-stretch gap-5 group overflow-hidden">
      
      {/* Thumbnail */}
      <div className="hidden sm:flex w-full sm:w-[30%] max-w-[200px] shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 relative items-center justify-center text-slate-400">
        {module.image_url ? (
          <img
            loading="lazy"
            src={module.image_url}
            alt={module.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 absolute inset-0"
          />
        ) : (
          <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center transition-transform duration-700 group-hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-1.5 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">No Cover</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>

      {/* Card Content */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Metadata Tags */}
          <div className="mb-3 flex flex-wrap gap-2 items-center">
            <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${getCategoryStyles(module.category)}`}>
              <HugeiconsIcon icon={getCategoryIcon(module.category)} className={`w-3.5 h-3.5 ${getCategoryIconColor(module.category)}`} />
              <span className="truncate max-w-[100px] sm:max-w-full">{module.category}</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              {module.level}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-200 shrink-0">
              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {module.duration}
            </span>
            {isCompleted && !isAdminView && (
              <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700 border border-green-200 shrink-0">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5 text-green-500" />
                Completed
              </span>
            )}
          </div>

          <h2 className="text-lg md:text-xl font-bold text-gray-900 group-hover:text-red-700 transition-colors truncate">
            {module.title}
          </h2>
          <div 
            className="mt-2 text-xs md:text-sm leading-relaxed text-gray-500 line-clamp-2 flex-1 prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(module.description || "") }}
          />
        </div>

        {/* Progress Bar (Only visible if enrolled and not in admin view) */}
        {localEnrolled && !isAdminView && (
          <div className="mt-4 w-full">
            <div className="mb-2 flex justify-between text-[11px] uppercase tracking-wider font-bold">
              <span className="text-gray-400">Progress</span>
              <span className={isCompleted ? "text-green-600" : "text-gray-900"}>{module.progress || 0}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${isCompleted ? "bg-green-500" : "bg-red-600"}`}
                style={{ width: `${module.progress || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex flex-row gap-3 w-full">
          {isAdminView ? (
            <>
              <button 
                onClick={() => toast("Opening module manager...")}
                className="flex-1 rounded-xl px-2 sm:px-4 py-2 text-[11px] sm:text-xs font-bold text-white transition cursor-pointer truncate bg-gray-900 hover:bg-black"
              >
                Manage
              </button>
              <button className="flex-1 rounded-xl border border-gray-200 px-2 sm:px-4 py-2 text-[11px] sm:text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer truncate">
                Preview
              </button>
            </>
          ) : localEnrolled ? (
            <button 
              onClick={handleNavigation}
              className={`flex-1 rounded-xl px-2 sm:px-4 py-2 text-[11px] sm:text-xs font-bold text-white transition cursor-pointer truncate ${
                isCompleted ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isCompleted ? "Review Module" : "Continue"}
            </button>
          ) : (
            <button
              onClick={handleEnrollClick}
              disabled={isEnrolling}
              className={`flex-1 rounded-xl px-2 sm:px-4 py-2 text-[11px] sm:text-xs font-bold text-white transition flex items-center justify-center gap-1 sm:gap-2 truncate ${
                isEnrolling ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 cursor-pointer"
              }`}
            >
              {isEnrolling ? (
                <><Spinner /> Enrolling...</>
              ) : (
                "Enroll Now"
              )}
            </button>
          )}

          {!isAdminView && !localEnrolled && (
            <button className="flex-1 rounded-xl border border-gray-200 px-2 sm:px-4 py-2 text-[11px] sm:text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer truncate">
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default ModuleCard;
