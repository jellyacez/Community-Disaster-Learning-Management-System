import { CheckCircleIcon, LockIcon, PlayIcon, DocumentIcon, QuizIcon, CloseIcon } from "./ModuleIcons";
import { decodeHtml } from "../../../../utils/textUtils";

export default function ModuleViewerSidebar({
  module,
  levels = [],
  completedStepIds = [],
  activeStepId,
  isSidebarOpen,
  setIsSidebarOpen,
  handleStepClick,
  isPreviewMode = false
}) {
  const getStepIcon = (type) => {
    switch(type) {
      case "video": return <PlayIcon />;
      case "quiz":
      case "situational": return <QuizIcon />;
      default: return <DocumentIcon />;
    }
  };

  // Calculate overall module progress
  const totalSteps = levels.reduce((acc, lvl) => acc + (lvl.steps?.length || 0), 0);
  const progressPercentage = totalSteps > 0 ? Math.round((completedStepIds.length / totalSteps) * 100) : 0;

  return (
    <aside className={`
      fixed inset-y-0 right-0 z-40 w-80 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
      md:relative md:translate-x-0 md:w-80 md:border-l-0 md:border-r md:border-gray-200 dark:md:border-slate-800 md:shadow-none
      ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}
    `}>
      <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 dark:text-white line-clamp-2">{decodeHtml(module.title) || "Module Loading..."}</h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-red-600 transition-all duration-700 ease-out absolute left-0 top-0 bottom-0"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-600 dark:text-slate-400">{progressPercentage}%</span>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden ml-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg shrink-0">
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {levels.map((lvl) => (
          <div key={lvl.id || lvl.levelOrder} className="space-y-2">
            <div className="flex items-center gap-2 px-2 pb-1 border-b border-gray-50 dark:border-slate-800/60">
               <h3 className={`text-xs font-bold uppercase ${(lvl.isUnlocked || isPreviewMode) ? 'text-gray-700 dark:text-slate-300' : 'text-gray-400 dark:text-slate-600'}`}>
                 Level {lvl.level_order}: {decodeHtml(lvl.title)}
               </h3>
               {!(lvl.isUnlocked || isPreviewMode) && <LockIcon className="w-3 h-3 text-gray-400 dark:text-slate-500" />}
            </div>
            
            <div className="space-y-1.5">
              {(lvl.steps || []).map((step, idx) => {
                const isCompleted = completedStepIds.includes(step.id);
                // Determine if this step is the exact next step available globally
                // But simplified for the UI: if level is unlocked and step is either completed or next in line, it's clickable.
                const isActive = step.id === activeStepId;
                
                // For the sidebar visual, we lock steps in unlocked levels if they haven't completed the previous step
                const previousStepInLevel = idx > 0 ? lvl.steps[idx - 1] : null;
                const isStepLocked = isPreviewMode ? false : (!(lvl.isUnlocked || isPreviewMode) || (previousStepInLevel && !completedStepIds.includes(previousStepInLevel.id) && !isCompleted));

                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(step)}
                    disabled={isStepLocked && !isActive}
                    className={`
                      w-full text-left px-4 py-3 rounded-xl flex items-start gap-3 transition-all duration-200
                      ${isActive ? "bg-red-50 border border-red-200 shadow-sm dark:bg-red-950/40 dark:border-red-900/50" : "border border-transparent hover:bg-gray-50 dark:hover:bg-slate-800/60"}
                      ${isStepLocked && !isActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isCompleted ? <CheckCircleIcon /> : (isStepLocked && !isActive) ? <LockIcon /> : getStepIcon(step.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold line-clamp-2 ${isActive ? "text-red-900 dark:text-red-200" : "text-gray-700 dark:text-slate-300"}`}>
                        {step.step_order}. {decodeHtml(step.title)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 capitalize mt-0.5">
                         {step.type.replace(/_/g, ' ')} {step.is_final_assessment ? "(Final Assessment)" : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
              {(!lvl.steps || lvl.steps.length === 0) && (
                 <p className="text-xs text-gray-400 dark:text-slate-500 px-2 italic">No steps in this level.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
