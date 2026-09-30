import { useState, useCallback, useEffect } from "react";
import {
  PlayIcon,
  DocumentIcon,
  QuizIcon,
  MenuIcon,
} from "./ModuleIcons";
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
  handleNextStep,
  isCompleting,
  getAssessmentForStep,
  loopBackData,
  acknowledgeLoopBack,
  retryCount = 0,
  isPreviewMode = false,
  navigate,
  setIsSidebarOpen,
}) {
  /*
   * ---------------------------------------------------------
   * Assessment data
   * ---------------------------------------------------------
   */
  const assessmentData = activeStep
    ? getAssessmentForStep(activeStep.id)
    : {
        questions: [],
        isLoading: false,
      };

  const isAssessment =
    assessmentData?.questions?.length > 0 ||
    [
      "quiz",
      "situational",
      "priority_action",
      "hazard_identification",
      "action_sequence",
    ].includes(activeStep?.type);

  /*
   * ---------------------------------------------------------
   * Video detection
   * ---------------------------------------------------------
   */
  const isVideoMedia = Boolean(
    activeStep?.media_url &&
      /\.(mp4|webm|ogg|mov)($|\?)/i.test(activeStep.media_url)
  );

  const isVideoStep = Boolean(
    activeStep &&
      (
        isVideoMedia ||
        activeStep.type === "video" ||
        activeStep.step_type === "video"
      )
  );

  /*
   * ---------------------------------------------------------
   * Video progress
   * ---------------------------------------------------------
   */
  const [videoProgressMap, setVideoProgressMap] = useState({});

  /*
   * ---------------------------------------------------------
   * Offline status
   * ---------------------------------------------------------
   */
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== "undefined"
      ? !navigator.onLine
      : false
  );

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * Video progress callback
   * ---------------------------------------------------------
   */
  const handleVideoProgress = useCallback(
    ({ stepId, watchedRatio = 0, canContinue = false }) => {
      if (!stepId) return;

      setVideoProgressMap((prev) => {
        const previous = prev[stepId];

        return {
          ...prev,
          [stepId]: {
            watchedRatio: Math.max(
              previous?.watchedRatio || 0,
              watchedRatio
            ),
            canContinue: Boolean(
              previous?.canContinue || canContinue
            ),
          },
        };
      });
    },
    []
  );

  /*
   * ---------------------------------------------------------
   * Current step status
   * ---------------------------------------------------------
   */
  const isAlreadyCompleted = Boolean(
    activeStep &&
      (
        isPreviewMode ||
        completedStepIds.includes(activeStep.id)
      )
  );

  const currentVideoProgress = activeStep
    ? videoProgressMap[activeStep.id]
    : null;

  /*
   * ---------------------------------------------------------
   * Video gate
   *
   * Video requires 90% watched before continuing.
   * Previously completed steps bypass the gate.
   * Offline mode also bypasses the gate.
   * ---------------------------------------------------------
   */
  const isVideoGated = Boolean(
    isVideoStep &&
      !isAlreadyCompleted &&
      !currentVideoProgress?.canContinue
  );

  /*
   * ---------------------------------------------------------
   * Determine last step
   * ---------------------------------------------------------
   */
  const lastLevel =
    levels.length > 0
      ? levels[levels.length - 1]
      : null;

  const lastStep =
    lastLevel?.steps?.length > 0
      ? lastLevel.steps[lastLevel.steps.length - 1]
      : null;

  // step_order restarts at each level, so derive the overall position
  const flatIndex = activeStep
    ? levels
        .flatMap((l) => l.steps || [])
        .findIndex((s) => s.id === activeStep.id)
    : -1;
  const currentStepNumber =
    flatIndex >= 0 ? flatIndex + 1 : activeStep?.step_order;

  const isLastStep = Boolean(
    activeStep?.id &&
      lastStep?.id === activeStep.id
  );

  /*
   * ---------------------------------------------------------
   * Step icon
   * ---------------------------------------------------------
   */
  const getStepIcon = (type) => {
    switch (type) {
      case "video":
        return <PlayIcon />;

      case "quiz":
      case "situational":
        return <QuizIcon className="w-4 h-4" />;

      default:
        return <DocumentIcon />;
    }
  };

  /*
   * ---------------------------------------------------------
   * Render
   * ---------------------------------------------------------
   */
  return (
    <main className="flex-1 flex flex-col min-h-0 bg-white relative">
      {/* -----------------------------------------------------
          LOOP BACK MODAL
          ----------------------------------------------------- */}
      <LoopBackModal
        acknowledgeLoopBack={acknowledgeLoopBack}
        loopBackData={loopBackData}
      />

      {/* -----------------------------------------------------
          OFFLINE BANNER
          ----------------------------------------------------- */}
      {isOffline && (
        <div className="bg-amber-500 text-amber-50 text-[11px] sm:text-xs font-bold text-center py-1.5 px-4 flex items-center justify-center gap-2 z-20">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243-2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>

          <span>
            Offline Mode: Progress will be saved locally and synced
            when you reconnect.
          </span>
        </div>
      )}

      {/* -----------------------------------------------------
          TOP BAR
          ----------------------------------------------------- */}
      <header className="border-b border-gray-200 bg-white px-4 py-3 md:px-12 flex items-center justify-between z-10 shrink-0">
        {/* Exit button */}
        <button
          type="button"
          onClick={() =>
            navigate
              ? navigate("/userDashboard")
              : handleStepClick(null)
          }
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>

          <span>Exit to Dashboard</span>
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs font-medium text-gray-500">
            {activeStep
              ? `Step ${currentStepNumber} of ${totalSteps}`
              : `${completedStepIds.length} of ${totalSteps} completed`}
          </span>

          <div className="w-16 sm:w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-600 transition-all duration-300"
              style={{
                width: `${
                  totalSteps > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (completedStepIds.length / totalSteps) *
                            100
                        )
                      )
                    : 0
                }%`,
              }}
            />
          </div>

          {/* Mobile sidebar button */}
          {setIsSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-1.5 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition shrink-0 ml-1"
              aria-label="Open course navigation"
            >
              <MenuIcon />
            </button>
          )}
        </div>
      </header>

      {/* -----------------------------------------------------
          MAIN CONTENT
          ----------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10">
        {activeStep ? (
          <div className="space-y-4">
            {/* Offline video warning */}
            {isOffline && isVideoStep && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium px-4 py-3 rounded-xl flex items-start gap-2">
                <svg
                  className="w-4 h-4 shrink-0 mt-0.5 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>

                <p>
                  You are currently offline. Embedded videos require
                  an active internet connection to play. You may skip
                  this video until you are reconnected.
                </p>
              </div>
            )}

            {/* Step content */}
            <StepContent
              activeStep={activeStep}
              assessmentData={assessmentData}
              completedStepIds={completedStepIds}
              handleCompleteAndContinue={handleCompleteAndContinue}
              handleNextStep={handleNextStep}
              isAssessment={isAssessment}
              isLastStep={isLastStep}
              isPreviewMode={isPreviewMode}
              isVideoMedia={isVideoMedia}
              onVideoProgress={handleVideoProgress}
              retryCount={retryCount}
              totalSteps={totalSteps}
            />
          </div>
        ) : (
          /* Curriculum map */
          <CurriculumMap
            completedStepIds={completedStepIds}
            getStepIcon={getStepIcon}
            handleStepClick={handleStepClick}
            isPreviewMode={isPreviewMode}
            levels={levels}
          />
        )}
      </div>

      {/* -----------------------------------------------------
          BOTTOM ACTION BAR
          ----------------------------------------------------- */}
      {activeStep && (
        <div className="border-t border-gray-200 bg-white px-6 py-4 md:px-12 z-10 sticky bottom-0">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            {/* View map */}
            <button
              type="button"
              onClick={() => handleStepClick(null)}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-2 shrink-0"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>

              View Map
            </button>

            {/* Normal content completion */}
            {!isAssessment && (
              <div className="flex items-center gap-3">
                {/* Video not watched enough */}
                {isVideoGated && !isOffline && (
                  <div
                    id="video-watch-hint"
                    className="flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-2 rounded-lg transition-all"
                  >
                    <svg
                      className="w-4 h-4 text-amber-600 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>

                    <span>
                      Watch at least 90% to continue (
                      {Math.round(
                        (currentVideoProgress?.watchedRatio || 0) *
                          100
                      )}
                      %)
                    </span>
                  </div>
                )}

                {/* Video requirement met */}
                {isVideoStep &&
                  !isAlreadyCompleted &&
                  (currentVideoProgress?.canContinue || isOffline) && (
                    <div
                      id="video-watch-hint"
                      className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-2 rounded-lg transition-all"
                    >
                      <svg
                        className="w-4 h-4 text-emerald-600 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>

                      <span>
                        {isOffline
                          ? "Offline: Video skipped"
                          : `Watch requirement met (${Math.round(
                              (currentVideoProgress?.watchedRatio ||
                                0) * 100
                            )}%)`}
                      </span>
                    </div>
                  )}

                {/* Complete / continue button */}
                <button
                  id="complete-continue-btn"
                  type="button"
                  onClick={() => handleCompleteAndContinue(null)}
                  disabled={
                    isCompleting ||
                    (isVideoGated && !isOffline)
                  }
                  title={
                    isVideoGated && !isOffline
                      ? "Watch at least 90% of the video to continue"
                      : undefined
                  }
                  className={`px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-all flex items-center gap-2 shrink-0 ${
                    isCompleting ||
                    (isVideoGated && !isOffline)
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed border border-gray-300 shadow-none opacity-80"
                      : "bg-red-600 hover:bg-red-700 active:scale-[0.99]"
                  }`}
                >
                  {isCompleting
                    ? "Saving..."
                    : isLastStep
                    ? "Finish Module"
                    : "Complete & Continue"}

                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
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
