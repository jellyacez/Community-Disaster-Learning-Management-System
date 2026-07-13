import DOMPurify from "dompurify";
import InteractiveQuiz from "./quiz/InteractiveQuiz";

export default function ModuleViewerContent({
  activeStep,
  totalSteps,
  handlePrevious,
  handleCompleteAndContinue,
  isCompleting,
  getAssessmentForStep
}) {
  const assessmentData = activeStep ? getAssessmentForStep(activeStep.id) : { questions: [], isLoading: false };
  const isAssessment = assessmentData.questions.length > 0 || activeStep?.type === "quiz" || activeStep?.type === "situational";
  const isVideoMedia = activeStep?.media_url && activeStep.media_url.match(/\.(mp4|webm|ogg|mov)$/i);

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeStep ? (
            <>
              <div className="mb-6">
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase tracking-wide">
                  Step {activeStep.step_order} of {totalSteps}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">
                {activeStep.title}
              </h1>
              
              {/* VIDEO OR MEDIA COMPONENT */}
              {activeStep.media_url && (
                <div className="w-full bg-black rounded-2xl mb-8 overflow-hidden shadow-lg relative aspect-video">
                  {(isVideoMedia || activeStep.type === "video" || activeStep.type === "situational") ? (
                    <video 
                      key={activeStep.id}
                      controls 
                      preload="metadata" 
                      className="w-full h-full object-contain"
                      controlsList="nodownload"
                      poster="/offline-video-placeholder.svg"
                    >
                      <source src={activeStep.media_url} />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img 
                      src={activeStep.media_url} 
                      alt="Step Media" 
                      className="w-full h-full object-cover" 
                    />
                  )}
                </div>
              )}

              {/* RICH TEXT CONTENT */}
              {activeStep.content && activeStep.content !== "<p></p>" && (
                <div 
                  className="prose prose-lg prose-red max-w-none text-gray-600 mb-10"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeStep.content) }}
                />
              )}

              {/* INTERACTIVE QUIZ COMPONENT */}
              {isAssessment && (
                <div className="mt-8">
                  <InteractiveQuiz 
                    key={activeStep.id} 
                    questions={assessmentData.questions} 
                    isLoading={assessmentData.isLoading}
                    onCompleteStep={handleCompleteAndContinue} 
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-gray-500">Select a lesson from the curriculum</div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white p-4 md:px-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 sticky bottom-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button 
            onClick={handlePrevious}
            disabled={!activeStep || activeStep.step_order === 1}
            className="px-5 py-3 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Previous
          </button>
          
          {/* Hide the Complete button if it's an assessment, because the Quiz component handles completion internally */}
          {!isAssessment && (
            <button 
              onClick={handleCompleteAndContinue}
              disabled={isCompleting}
              className={`px-8 py-3 rounded-xl font-bold text-sm text-white transition flex items-center gap-2 ${
                isCompleting ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 active:scale-95 shadow-md shadow-red-600/20"
              }`}
            >
              {isCompleting ? "Saving..." : activeStep?.step_order === totalSteps ? "Complete Module" : "Complete & Continue"}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
