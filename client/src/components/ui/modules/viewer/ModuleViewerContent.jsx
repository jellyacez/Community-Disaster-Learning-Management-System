import { useState, useCallback } from "react";
import { PlayIcon, DocumentIcon, QuizIcon, MenuIcon } from "./ModuleIcons";
import LoopBackModal from "./components/LoopBackModal";
import CurriculumMap from "./components/CurriculumMap";
import StepContent from "./components/StepContent";

export default function ModuleViewerContent({
  levels = [],
  completedStepIds = [],
  handleStepClick,
  activeStep,
  totalSteps,
  handleCompleteAndContinue,
  isCompleting,
  getAssessmentForStep,
  loopBackData,
  acknowledgeLoopBack,
  isPreviewMode = false,
  navigate,
  setIsSidebarOpen
}) {
  const assessmentData = activeStep ? getAssessmentForStep(activeStep.id) : { questions: [], isLoading: false };
  const isAssessment = assessmentData.questions?.length > 0 || activeStep?.type === "quiz" || activeStep?.type === "situational";
  const isVideoMedia = Boolean(activeStep?.media_url && activeStep.media_url.match(/\.(mp4|webm|ogg|mov)($|\?)/i));
  const isVideoStep = Boolean(
    activeStep && (
      isVideoMedia ||
      activeStep.type === "video" ||
      activeStep.step_type === "video" ||
      activeStep.type === "situational"
    )
  );

  const [videoProgressMap, setVideoProgressMap] = useState({});

  const handleVideoProgress = useCallback(({ stepId, watchedRatio, canContinue }) => {
    if (!stepId) return;
    setVideoProgressMap((prev) => ({
      ...prev,
      [stepId]: {
        watchedRatio: Math.max(prev[stepId]?.watchedRatio || 0, watchedRatio),
        canContinue: Boolean(prev[stepId]?.canContinue || canContinue)
      }
    }));
  }, []);

  const isAlreadyCompleted = Boolean(
    activeStep && (isPreviewMode || completedStepIds.includes(activeStep.id))
  );
  const currentVideoProgress = activeStep ? videoProgressMap[activeStep.id] : null;
  const isVideoGated = Boolean(
    isVideoStep && !isAlreadyCompleted && !currentVideoProgress?.canContinue
  );

  const getStepIcon = (type) => {
    switch(type) {
      case "video": return <PlayIcon />;
      case "quiz":
      case "situational": return <QuizIcon className="w-4 h-4" />;
      default: return <DocumentIcon />;
    }
  };

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-white relative">
      <LoopBackModal 
        loopBackData={loopBackData} 
        acknowledgeLoopBack={acknowledgeLoopBack} 
      />

      {/* Minimal Top Bar: progress indicator, exit action, mobile menu */}
      <header className="border-b border-gray-200 bg-white px-4 py-3 md:px-12 flex items-center justify-between z-10 shrink-0">
        <button
          onClick={() => navigate ? navigate("/userDashboard") : handleStepClick(null)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Exit to Dashboard</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs font-medium text-gray-500">
            {activeStep ? `Step ${activeStep.step_order} of ${totalSteps}` : `${completedStepIds.length} of ${totalSteps} completed`}
          </span>
          <div className="w-16 sm:w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-600 transition-all duration-300"
              style={{ width: `${totalSteps > 0 ? Math.round((completedStepIds.length / totalSteps) * 100) : 0}%` }}
            />
          </div>
          {setIsSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-1.5 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition shrink-0 ml-1"
              aria-label="Open course navigation"
            >
              <MenuIcon />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10">
        {activeStep ? (
          <StepContent 
            activeStep={activeStep}
            totalSteps={totalSteps}
            isVideoMedia={isVideoMedia}
            isAssessment={isAssessment}
            assessmentData={assessmentData}
            completedStepIds={completedStepIds}
            handleCompleteAndContinue={handleCompleteAndContinue}
            isPreviewMode={isPreviewMode}
            onVideoProgress={handleVideoProgress}
          />
        ) : (
          <CurriculumMap 
            levels={levels}
            completedStepIds={completedStepIds}
            handleStepClick={handleStepClick}
            getStepIcon={getStepIcon}
            isPreviewMode={isPreviewMode}
          />
        )}
      </div>

      {activeStep && (
        <div className="border-t border-gray-200 bg-white px-6 py-4 md:px-12 z-10 sticky bottom-0">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <button 
              onClick={() => handleStepClick(null)}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-2 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              View Map
            </button>
            
            {!isAssessment && (
              <div className="flex items-center gap-3">
                {isVideoGated && (
                  <div 
                    id="video-watch-hint"
                    className="flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-2 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Watch at least 90% to continue ({Math.round((currentVideoProgress?.watchedRatio || 0) * 100)}%)</span>
                  </div>
                )}

                {isVideoStep && !isAlreadyCompleted && currentVideoProgress?.canContinue && (
                  <div 
                    id="video-watch-hint"
                    className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-2 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Watch requirement met ({Math.round((currentVideoProgress?.watchedRatio || 0) * 100)}%)</span>
                  </div>
                )}

                <button 
                  id="complete-continue-btn"
                  onClick={() => handleCompleteAndContinue(null)}
                  disabled={isCompleting || isVideoGated}
                  title={isVideoGated ? "Watch at least 90% of the video to continue" : undefined}
                  className={`px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-all flex items-center gap-2 shrink-0 ${
                    isCompleting || isVideoGated
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed border border-gray-300 shadow-none opacity-80"
                      : "bg-red-600 hover:bg-red-700 active:scale-[0.99]"
                  }`}
                >
                  {isCompleting ? "Saving..." : activeStep?.id === levels[levels.length - 1]?.steps?.[levels[levels.length - 1]?.steps?.length - 1]?.id ? "Finish Module" : "Complete & Continue"}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
