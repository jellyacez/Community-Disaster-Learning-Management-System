import DOMPurify from "dompurify";
import InteractiveQuiz from "../quiz/InteractiveQuiz";

export default function StepContent({
  activeStep,
  totalSteps,
  isVideoMedia,
  isAssessment,
  assessmentData,
  completedStepIds,
  handleCompleteAndContinue
}) {
  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white p-5 md:p-8 rounded-[2rem] shadow-sm border border-gray-100">
      <div className="mb-4">
        <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-full uppercase tracking-wider border border-red-100">
          Step {activeStep.step_order} of {totalSteps}
        </span>
      </div>
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-6 leading-tight tracking-tight">
        {activeStep.title}
      </h1>

      {/* VIDEO OR MEDIA COMPONENT */}
      {activeStep.media_url && (
        <div className="w-full bg-black rounded-3xl mb-10 overflow-hidden shadow-lg relative aspect-video border border-gray-200">
          {isVideoMedia || activeStep.type === "video" || activeStep.type === "situational" ? (
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
          className="prose prose-lg prose-red max-w-none text-gray-700 mb-10 leading-relaxed font-medium"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeStep.content) }}
        />
      )}

      {/* INTERACTIVE QUIZ COMPONENT */}
      {isAssessment && (
        <div className="mt-10">
          {completedStepIds.includes(activeStep.id) ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-emerald-900 mb-2">Assessment Completed</h3>
              <p className="text-emerald-700 font-medium">You have already successfully passed this assessment.</p>
            </div>
          ) : (
            <InteractiveQuiz
              key={activeStep.id}
              stepType={activeStep.type}
              questions={assessmentData.questions}
              isLoading={assessmentData.isLoading}
              onCompleteStep={handleCompleteAndContinue}
            />
          )}
        </div>
      )}
    </div>
  );
}
