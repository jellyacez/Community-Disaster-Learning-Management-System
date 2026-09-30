import { memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { authClient } from "../../../lib/auth-client";
import { ADMIN_ROLES } from "../../../constants/roles";
import {
  Activity01Icon,
  Alert01Icon,
  Book01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { useModuleEnrollment } from "../../../hooks/useModuleEnrollment";
import DOMPurify from "dompurify";
import toast from "react-hot-toast";
import { decodeHtml } from "../../../utils/textUtils";
import StatusBadge from "../StatusBadge";

const getCategoryIcon = (category) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("flood") || cat.includes("water")) return Activity01Icon;
  if (cat.includes("earthquake") || cat.includes("seismic")) return Alert01Icon;
  return Book01Icon;
};

const ModuleCard = memo(function ModuleCard({
  module,
  enrolled = false,
  isPreview = false,
  isAdminView = false,
  onPreviewClick,
  onEnrollSuccess,
  onManageClick,
  onEnrollClick,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session } = authClient.useSession();
  const userRole = session?.user?.role;
  const isAdmin = userRole && ADMIN_ROLES.includes(userRole);

  const isCompleted =
    enrolled && (module.progress === 100 || module.status === "Completed");

  const { localEnrolled, isEnrolling, handleEnroll } = useModuleEnrollment({
    moduleId: module.id,
    moduleTitle: module.title,
    initialEnrolled: enrolled,
    onEnrollSuccess,
  });

  const resolveImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${import.meta.env.DEV ? "http://localhost:5000" : ""}/${url.startsWith("/") ? url.slice(1) : url}`;
  };

  const handleLaunchViewer = (e) => {
    e.stopPropagation();
    if (isPreview && onPreviewClick) return onPreviewClick();
    if (isPreview) {
      return toast.error("Navigation is disabled in Live Preview Mode.");
    }
    navigate(`/user/modules/${module.id}`);
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    if (isPreview && onPreviewClick) return onPreviewClick();
    if (isPreview) {
      return toast.error("Navigation is disabled in Live Preview Mode.");
    }

    if (isAdmin || isAdminView) {
      if (location.pathname.startsWith("/admin/super")) {
        navigate(`/admin/super/modules/${module.id}/details`);
      } else if (location.pathname.startsWith("/admin/system")) {
        navigate(`/admin/system/modules/${module.id}/details`);
      } else {
        navigate(`/admin/mdrrmo/modules/${module.id}/details`);
      }
    } else {
      navigate(`/user/modules/${module.id}/details`);
    }
  };

  const handleManageModule = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (isPreview && onPreviewClick) return onPreviewClick();
    if (isPreview) {
      return toast.error("Navigation is disabled in Live Preview Mode.");
    }

    if (onManageClick) {
      return onManageClick(module.id || module.mod_id);
    }

    let builderPath = "/admin/mdrrmo/modules/builder";
    if (userRole === "system_admin" || location.pathname.startsWith("/admin/system")) {
      builderPath = "/admin/system/modules/builder";
    }
    navigate(`${builderPath}?id=${module.id || module.mod_id}`);
  };

  const handleEnrollClick = (e) => {
    e.stopPropagation();
    if (isPreview && onPreviewClick) return onPreviewClick();
    if (isPreview) {
      return toast.error("Enrollment is disabled in Live Preview Mode.");
    }

    if (onEnrollClick) {
      return onEnrollClick(module);
    }
    handleEnroll();
  };

  const isRejected = isAdminView && module.status === "draft" && module.rejection_reason;

  return (
    <div
      onClick={handleViewDetails}
      className={`rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col sm:flex-row items-stretch gap-5 group overflow-hidden cursor-pointer hover:border-gray-300 ${
        isRejected
          ? "border-l-4 border-l-red-500 border-y-gray-200 border-r-gray-200"
          : "border-gray-200"
      }`}
    >
      {module.image_url ? (
        <div
          className={`hidden sm:flex shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 relative items-center justify-center text-slate-400 ${
            isAdminView ? "w-20 md:w-24 flex-col" : "w-32 sm:w-40 md:w-48"
          }`}
        >
          <img
            loading="lazy"
            src={resolveImageUrl(module.image_url)}
            alt={module.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>
      ) : (
        <div
          className={`hidden sm:flex shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 relative flex-col items-center justify-center text-slate-400 transition-transform duration-700 group-hover:scale-105 ${
            isAdminView ? "w-20 md:w-24" : "w-32 sm:w-40 md:w-48"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={isAdminView ? "w-7 h-7 mb-1.5 opacity-40" : "w-10 h-10 mb-1.5 opacity-40"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <span
            className={`${
              isAdminView ? "text-[8px]" : "text-[9px]"
            } font-bold uppercase tracking-widest opacity-50`}
          >
            No Cover
          </span>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="mb-3 flex flex-wrap gap-2 items-center">
            <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 border border-red-100">
              <HugeiconsIcon
                icon={getCategoryIcon(module.category)}
                className="w-3.5 h-3.5"
              />
              <span className="truncate max-w-[100px] sm:max-w-full">
                {module.category}
              </span>
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 border border-gray-200">
              {module.level}
            </span>
            <span
              className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/30 shrink-0 cursor-help"
              title={
                module.duration === "Varies"
                  ? "Duration depends on learner pacing and situational choices"
                  : ""
              }
            >
              {module.duration}
            </span>
            {module.step_count > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-200 shrink-0">
                {module.step_count} Steps
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 border border-green-100 dark:bg-green-500/15 dark:text-green-300 dark:border-green-400/30 shrink-0">
                Completed
              </span>
            )}
            {module.module_status === "archived" && !module.has_newer_version && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-200 shrink-0">
                Previous version
              </span>
            )}
            {module.has_newer_version && (
              module.latest_published_id ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/user/modules/${module.latest_published_id}/details`);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 dark:text-blue-300 dark:border-blue-400/30 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 transition-colors shrink-0 cursor-pointer"
                  title="View newer version details"
                >
                  <span>Newer version available</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              ) : (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/30 shrink-0">
                  Newer version available
                </span>
              )
            )}
            {isAdminView && (
              <>
                {module.parent_mod_id &&
                  (module.status === "draft" || module.status === "pending_review") && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/30">
                      Draft Revision
                    </span>
                  )}
                {module.status === "draft" && module.rejection_reason ? (
                  <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 border border-red-200 shrink-0">
                    <HugeiconsIcon icon={Alert01Icon} className="w-3.5 h-3.5" />
                    Rejected - needs revision
                  </span>
                ) : module.status === "draft" ? (
                  <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 border border-gray-200 shrink-0">
                    Draft
                  </span>
                ) : module.status === "pending_review" ? (
                  <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/30 shrink-0">
                    Pending Review
                  </span>
                ) : module.status === "published" ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100 dark:text-emerald-300 shrink-0">
                    Published
                  </span>
                ) : module.status === "archived" ? (
                  <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600 border border-gray-200 shrink-0">
                    Archived
                  </span>
                ) : null}
              </>
            )}
          </div>

          <h2 className="text-xl font-bold text-gray-900 group-hover:text-red-700 transition-colors truncate">
            {decodeHtml(module.title)}
          </h2>
          {isRejected && (
            <div className="mt-1.5 p-2 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
              <HugeiconsIcon icon={Alert01Icon} className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-red-800 line-clamp-2" title={module.rejection_reason}>
                <span className="font-bold uppercase tracking-widest text-[9px] mr-1 opacity-80">
                  Note:
                </span>
                {module.rejection_reason}
              </p>
            </div>
          )}
          <div
            className="mt-2 text-sm leading-relaxed text-gray-600 line-clamp-2 flex-1 prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(module.description || ""),
            }}
          />
          {!localEnrolled && !isAdminView && module.previous_version_status === "Completed" && (
            <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>You completed an earlier version</span>
            </p>
          )}
        </div>

        {localEnrolled && (
          <div className="mt-4 w-full">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-gray-500">Progress</span>
              <span
                className={`font-bold ${isCompleted ? "text-green-600" : "text-gray-900"}`}
              >
                {module.progress || 0}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isCompleted ? "bg-green-500" : "bg-red-600"
                }`}
                style={{ width: `${module.progress || 0}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-row gap-3 w-full">
          {localEnrolled ? (
            <button
              onClick={handleLaunchViewer}
              className={`flex-1 rounded-xl px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition cursor-pointer truncate ${
                isCompleted
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isCompleted ? "Review Module" : module.progress === 0 ? "Start" : "Continue"}
            </button>
          ) : isAdminView ? (
            module.status === "archived" ? (
              <button
                onClick={handleViewDetails}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer truncate"
              >
                View Details
              </button>
            ) : (
              <>
                <button
                  onClick={handleManageModule}
                  disabled={module.has_active_draft}
                  title={
                    module.has_active_draft
                      ? "A draft revision is in progress. Please manage the draft."
                      : isRejected
                      ? "Edit and resolve revision feedback"
                      : "Manage & Edit Module"
                  }
                  className={`flex-[1.5] rounded-xl px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition flex items-center justify-center gap-1 sm:gap-2 truncate ${
                    module.has_active_draft
                      ? "bg-gray-400 cursor-not-allowed opacity-70"
                      : isRejected
                      ? "bg-red-600 hover:bg-red-700 cursor-pointer"
                      : "bg-gray-900 hover:bg-black dark:bg-slate-600 dark:hover:bg-slate-500 cursor-pointer"
                  }`}
                >
                  {module.has_active_draft ? "Revision in Progress" : isRejected ? "Revise & Edit" : "Manage"}
                </button>
                <button
                  onClick={handleViewDetails}
                  className="flex-1 rounded-xl border border-gray-200 px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer truncate"
                >
                  View Details
                </button>
              </>
            )
          ) : (
            <>
              <button
                onClick={handleViewDetails}
                className="flex-1 rounded-xl border border-gray-200 px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer truncate"
              >
                View Details
              </button>
              <button
                onClick={handleEnrollClick}
                disabled={isEnrolling}
                className={`flex-1 rounded-xl px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition flex items-center justify-center gap-1 sm:gap-2 truncate ${
                  isEnrolling
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gray-900 hover:bg-black dark:bg-slate-600 dark:hover:bg-slate-500 cursor-pointer"
                }`}
              >
                {isEnrolling ? "Enrolling..." : "Enroll Now"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default ModuleCard;