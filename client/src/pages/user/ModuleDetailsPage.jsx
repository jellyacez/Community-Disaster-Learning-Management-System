import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import DOMPurify from "dompurify";
import Spinner from "../../components/ui/Spinner";

const fetchModuleDetails = async (moduleId) => {
  const res = await apiClient.get(`modules/${moduleId}/details`);
  return res.data;
};

export default function ModuleDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["moduleDetails", id],
    queryFn: () => fetchModuleDetails(id),
    retry: 1
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner className="w-10 h-10 text-red-600" />
        <span className="mt-3 text-sm font-semibold text-gray-500">Retrieving syllabus structure...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100 max-w-2xl mx-auto mt-8">
        <p className="font-bold">Error loading module syllabus details.</p>
        <p className="text-sm mt-1">Please check your connection or return to the catalog.</p>
        <button 
          onClick={() => navigate("/user/catalog")}
          className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg"
        >
          Back to Catalog
        </button>
      </div>
    );
  }

  const { module, levels = [] } = data;
  
  const currentProgress = parseInt(module.progress || 0, 10);
  const isCompleted = module.status === "Completed" || currentProgress === 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-6 animate-in fade-in duration-200">
      
      {/* Back Navigation */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <span className="text-lg">←</span> Back
      </button>

      {/* Module Cover & Header Profile (Progress Bar Integrated Directly Inside) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-6 p-6 items-center">
        <div className="md:col-span-4 h-48 w-full bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden relative flex items-center justify-center text-slate-400">
          {module.image_url ? (
            <img 
              src={module.image_url} 
              alt={module.modname} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-2 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <span className="text-xs font-bold uppercase tracking-wider opacity-40">No Cover Banner</span>
            </div>
          )}
        </div>

        <div className="md:col-span-8 flex flex-col justify-between h-full space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="bg-red-50 text-red-700 text-xs font-extrabold px-3 py-1 rounded-full border border-red-100">
                {module.modcat}
              </span>
              <span className="bg-amber-50 text-amber-700 text-xs font-extrabold px-3 py-1 rounded-full border border-amber-100">
                {module.duration || "Varies"}
              </span>
              {isCompleted && (
                <span className="bg-green-50 text-green-700 text-xs font-extrabold px-3 py-1 rounded-full border border-green-100">
                  ✓ Completed
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
              {module.modname}
            </h1>
          </div>

          {/* Integrated Inline Progress Section */}
          <div className="w-full space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-400 uppercase tracking-wider">Module Progress</span>
              <span className={`font-black ${isCompleted ? "text-green-600" : "text-gray-900"}`}>
                {currentProgress}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 border border-gray-200/50">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isCompleted ? "bg-green-500" : "bg-red-600"
                }`}
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button 
              onClick={() => navigate(`/user/modules/${module.mod_id || module.id}`)}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all"
            >
              <span className="text-xs">▶</span> {isCompleted ? "Review Module Content" : "Launch Learning Viewer"}
            </button>
          </div>
        </div>
      </div>

      {/* Description Panel */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
          Course Synopsis
        </h3>
        <div 
          className="text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(module.description || "No curriculum synopsis provided.") }}
        />
      </div>

      {/* Level Sequence & Syllabus */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide pl-2 border-l-4 border-red-600">
          Module Curriculum Roadmap
        </h2>
        
        <div className="space-y-6">
          {levels.map((lvl) => (
            <div 
              key={lvl.level_id} 
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:border-gray-300 transition-colors"
            >
              
              {/* Level Header Info */}
              <div className="bg-gray-50/50 p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-gray-800 text-white font-mono text-xs px-2 py-0.5 rounded font-bold">
                      Level {lvl.level_order}
                    </span>
                    <h3 className="text-base font-black text-gray-900">
                      {lvl.level_title}
                    </h3>
                  </div>
                  {lvl.level_description && (
                    <p className="text-xs text-gray-500 font-medium">{lvl.level_description}</p>
                  )}
                </div>

                {/* Level Threshold Settings Flags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-emerald-100">
                    🏆 Passing threshold: {lvl.passing_threshold || 80}%
                  </span>
                  {lvl.is_locked_by_default ? (
                    <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-amber-100">
                      🔒 Locked initially
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-green-100">
                      🔓 Unlocked initially
                    </span>
                  )}
                </div>
              </div>

              {/* Steps inside this Level */}
              <div className="divide-y divide-gray-100 bg-white">
                {lvl.steps && lvl.steps.length > 0 ? (
                  lvl.steps.map((step) => (
                    <div 
                      key={step.step_id} 
                      className="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="text-xs font-bold font-mono text-gray-400 bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full shrink-0">
                          {step.step_order}
                        </span>
                        
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">
                            {step.step_title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">
                              {step.step_type}
                            </span>
                            
                            {/* Flags based on custom parameters */}
                            {step.is_final_assessment && (
                              <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide flex items-center gap-1">
                                🎓 Final Level Exam
                              </span>
                            )}
                            {step.loop_back_step_id && (
                              <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-100 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide flex items-center gap-1">
                                🔄 Loops back on fail
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-md uppercase tracking-wide">
                        {step.step_type === "quiz" ? "Quiz" : "Text"}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic p-4">No content steps configured in this level.</p>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}