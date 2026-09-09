import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";
import { useState, useMemo } from "react";
import DOMPurify from "dompurify";
import Spinner from "../../../components/ui/Spinner";
import { authClient } from "../../../lib/auth-client";
import { ADMIN_ROLES } from "../../../constants/roles";
import PublishedModulePreviewModal from "../../../components/ui/modules/viewer/PublishedModulePreviewModal";
import { decodeHtml } from "../../../utils/textUtils";
import toast from "react-hot-toast";

const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `http://localhost:5000/${url.startsWith("/") ? url.slice(1) : url}`;
};

const fetchModuleDetails = async (moduleId) => {
  const res = await apiClient.get(`modules/${moduleId}/details`);
  return res.data;
};

function getStepTypeBadge(type) {
  switch (type) {
    case "video":
      return { label: "Video", icon: "video" };
    case "quiz":
    case "situational":
    case "priority_action":
    case "hazard_identification":
    case "action_sequence":
      return { label: "Assessment", icon: "quiz" };
    default:
      return { label: "Reading", icon: "text" };
  }
}

function StepIcon({ type }) {
  const meta = getStepTypeBadge(type);
  if (meta.icon === "video") {
    return (
      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (meta.icon === "quiz") {
    return (
      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export default function ModuleDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role && ADMIN_ROLES.includes(session.user.role);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["moduleDetails", id],
    queryFn: () => fetchModuleDetails(id),
    retry: 1
  });

  const handleEnroll = async () => {
    if (isEnrolling) return;
    setIsEnrolling(true);
    try {
      const res = await apiClient.post(`/modules/${id}/enroll`);
      if (res.data?.success) {
        toast.success(`Enrollment Success! You are now enrolled in ${decodeHtml(data?.module?.modname) || "this module"}.`);
        queryClient.invalidateQueries({ queryKey: ["moduleDetails", id] });
        queryClient.invalidateQueries({ queryKey: ["availableModules"] });
        queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
        navigate("/user/enrolled");
      }
    } catch (err) {
      console.error("Enrollment error:", err);
      toast.error(err.response?.data?.message || "Failed to enroll in module. Please try again.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleBack = () => {
    if (location.state?.fromApprovalDesk) {
      navigate("/admin/mdrrmo/approvals");
    } else {
      navigate(-1);
    }
  };

  const totalSteps = useMemo(() => {
    if (!data?.levels) return 0;
    return data.levels.reduce((acc, lvl) => acc + (lvl.steps?.length || 0), 0);
  }, [data?.levels]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 h-48 sm:h-52 w-full bg-gray-100 rounded-xl" />
          <div className="md:col-span-8 space-y-4">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-7 w-3/4 bg-gray-200 rounded" />
            <div className="h-3 w-full bg-gray-100 rounded-full" />
            <div className="h-10 w-44 bg-gray-200 rounded-lg" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 space-y-3">
          <div className="h-4 w-28 bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-5/6 bg-gray-100 rounded" />
        </div>
        <div className="space-y-4">
          <div className="h-5 w-40 bg-gray-200 rounded" />
          <div className="h-40 bg-white rounded-2xl border border-gray-200/80" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-100 max-w-2xl mx-auto mt-8">
        <p className="font-bold">Error loading module syllabus details.</p>
        <p className="text-sm mt-1">Please check your connection or return to the catalog.</p>
        <button 
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { module, levels = [] } = data;
  
  const isEnrolled = Boolean(module.is_enrolled);
  const currentProgress = parseInt(module.progress || 0, 10);
  const isCompleted = isEnrolled && (module.status === "Completed" || currentProgress === 100);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Back Navigation */}
      <div>
        <button 
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back</span>
        </button>
      </div>

      {/* Module Cover & Header Profile (IBM SkillsBuild course overview pattern) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-6 p-6 md:p-8 items-center">
        {/* Cover Thumbnail / Fixed Height Cap */}
        <div className="md:col-span-4 h-48 sm:h-52 w-full bg-gray-50 border border-gray-100 rounded-xl overflow-hidden relative flex items-center justify-center text-gray-400 shrink-0">
          {module.image_url ? (
            <img 
              src={resolveImageUrl(module.image_url)} 
              alt={module.modname} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <svg className="w-10 h-10 mb-1.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xs font-medium text-gray-400">Course Resource</span>
            </div>
          )}
        </div>

        {/* Content & Metadata */}
        <div className="md:col-span-8 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            {/* Plain metadata text instead of noisy candy pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="font-semibold text-gray-800">{module.modcat || "General"}</span>
              <span className="text-gray-300">·</span>
              <span>{module.duration || "Self-paced"}</span>
              {isCompleted && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded text-[11px]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Completed
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight">
              {decodeHtml(module.modname)}
            </h1>
          </div>

          <div className="space-y-3.5">
            {/* Integrated Progress Indicator */}
            <div className="w-full space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-gray-500">Course Progress</span>
                <span className={`font-semibold ${isCompleted ? "text-emerald-600" : isEnrolled ? "text-gray-700" : "text-gray-400"}`}>
                  {isEnrolled ? `${currentProgress}%` : "Not Enrolled"}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    isCompleted ? "bg-emerald-500" : isEnrolled ? "bg-red-600" : "bg-gray-200"
                  }`}
                  style={{ width: `${isEnrolled ? currentProgress : 0}%` }}
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-0.5">
              {isAdmin ? (
                <button 
                  onClick={() => setIsPreviewOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-medium rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Preview Module (Read-Only)</span>
                </button>
              ) : !isEnrolled ? (
                <button 
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm hover:shadow cursor-pointer disabled:cursor-not-allowed"
                >
                  {isEnrolling ? (
                    <>
                      <Spinner className="w-4 h-4 text-white" />
                      <span>Enrolling...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Enroll in Module</span>
                    </>
                  )}
                </button>
              ) : (
                <button 
                  onClick={() => navigate(`/user/modules/${module.mod_id || module.id}`)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm hover:shadow cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>{isCompleted ? "Review Module Content" : "Launch Learning Viewer"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description Panel */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Course Synopsis
        </h2>
        <div 
          className="text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(module.description || "No curriculum synopsis provided.") }}
        />
      </div>

      {/* Level Sequence & Syllabus (Clean roadmap, no side-tab antipattern) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Curriculum Roadmap
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            {levels.length} {levels.length === 1 ? 'level' : 'levels'} · {totalSteps} {totalSteps === 1 ? 'step' : 'steps'}
          </span>
        </div>
        
        <div className="space-y-4">
          {levels.map((lvl) => (
            <div 
              key={lvl.level_id} 
              className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm"
            >
              
              {/* Level Header Info: Fixed badge wrapping and plain text metadata */}
              <div className="bg-gray-50/70 px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-gray-700 bg-gray-200/70 border border-gray-300/60 px-2.5 py-1 rounded-md">
                      Level {lvl.level_order}
                    </span>
                    <h3 className="text-sm md:text-base font-bold text-gray-900 truncate">
                      {decodeHtml(lvl.level_title)}
                    </h3>
                  </div>
                  {lvl.level_description && (
                    <div 
                      className="text-xs text-gray-500 font-normal pl-0.5 prose prose-xs max-w-none [&>p]:m-0"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lvl.level_description) }}
                    />
                  )}
                </div>

                {/* Level Threshold Settings as clean plain metadata instead of loud colored pill badges */}
                <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                  <span className="flex items-center gap-1">
                    Passing score: <strong className="font-semibold text-gray-700">{lvl.passing_threshold || 80}%</strong>
                  </span>
                  {lvl.is_locked_by_default ? (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                        <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                        Locked initially
                      </span>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Steps inside this Level */}
              <div className="divide-y divide-gray-100 bg-white">
                {lvl.steps && lvl.steps.length > 0 ? (
                  lvl.steps.map((step) => {
                    const typeMeta = getStepTypeBadge(step.step_type);
                    return (
                      <div 
                        key={step.step_id} 
                        className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/60 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="shrink-0 text-xs font-mono text-gray-400 bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full font-medium">
                            {step.step_order}
                          </span>
                          
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {decodeHtml(step.step_title)}
                            </p>
                            
                            {/* Flags only when non-standard (e.g. final exam, loop-back) */}
                            {(step.is_final_assessment || step.loop_back_step_id) && (
                              <div className="flex items-center gap-1.5 mt-1">
                                {step.is_final_assessment && (
                                  <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">
                                    Final Exam
                                  </span>
                                )}
                                {step.loop_back_step_id && (
                                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                                    Retake required on fail
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Step Type as clean text metadata with icon */}
                        <div className="shrink-0 flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                          <StepIcon type={step.step_type} />
                          <span>{typeMeta.label}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-400 italic p-5">No content steps configured in this level.</p>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

      <PublishedModulePreviewModal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        moduleId={module.mod_id || module.id} 
      />
    </div>
  );
}