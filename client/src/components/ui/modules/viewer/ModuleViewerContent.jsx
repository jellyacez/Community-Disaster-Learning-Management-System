import { PlayIcon, DocumentIcon, QuizIcon } from "./ModuleIcons";
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
  acknowledgeLoopBack
}) {
  const assessmentData = activeStep ? getAssessmentForStep(activeStep.id) : { questions: [], isLoading: false };
  const isAssessment = assessmentData.questions?.length > 0 || activeStep?.type === "quiz" || activeStep?.type === "situational";
  const isVideoMedia = activeStep?.media_url && activeStep.media_url.match(/\.(mp4|webm|ogg|mov)$/i);

  const getStepIcon = (type) => {
    switch(type) {
      case "video": return <PlayIcon />;
      case "quiz":
      case "situational": return <QuizIcon className="w-4 h-4" />;
      default: return <DocumentIcon />;
    }
  };

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-gray-50 relative">
      <LoopBackModal 
        loopBackData={loopBackData} 
        acknowledgeLoopBack={acknowledgeLoopBack} 
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {activeStep ? (
          <StepContent 
            activeStep={activeStep}
            totalSteps={totalSteps}
            isVideoMedia={isVideoMedia}
            isAssessment={isAssessment}
            assessmentData={assessmentData}
            completedStepIds={completedStepIds}
            handleCompleteAndContinue={handleCompleteAndContinue}
          />
        ) : (
          <CurriculumMap 
            levels={levels}
            completedStepIds={completedStepIds}
            handleStepClick={handleStepClick}
            getStepIcon={getStepIcon}
          />
        )}
      </div>

      {activeStep && (
        <div className="border-t border-gray-200 bg-white p-4 md:px-8 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] z-10 sticky bottom-0">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button 
              onClick={() => handleStepClick(null)}
              className="px-5 py-3 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              View Map
            </button>
            
            {!isAssessment && (
              <button 
                onClick={() => handleCompleteAndContinue(null)}
                disabled={isCompleting}
                className={`px-8 py-3 rounded-xl font-bold text-sm text-white transition flex items-center gap-2 ${
                  isCompleting ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 active:scale-95 shadow-md shadow-red-600/20"
                }`}
              >
                {isCompleting ? "Saving..." : activeStep?.id === levels[levels.length - 1]?.steps?.[levels[levels.length - 1]?.steps?.length - 1]?.id ? "Finish Module" : "Complete & Continue"}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
