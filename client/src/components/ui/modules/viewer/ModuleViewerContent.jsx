import DOMPurify from "dompurify";
import InteractiveQuiz from "./quiz/InteractiveQuiz";
import { LockIcon, CheckCircleIcon, PlayIcon, DocumentIcon, QuizIcon } from "./ModuleIcons";

export default function ModuleViewerContent({
  levels = [],
  completedStepIds = [],
  handleStepClick,
  activeStep,
  totalSteps,
  handlePrevious,
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
      {/* Loop Back Modal */}
      {loopBackData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-200 border border-red-100">
             <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             </div>
             <h2 className="text-2xl font-black text-gray-900 mb-2">{loopBackData.isFinalAssessment ? "Assessment Failed" : "Quiz Failed"}</h2>
             <p className="text-gray-600 mb-6 text-sm leading-relaxed">{loopBackData.message}</p>
             <div className="bg-red-50 text-red-900 py-3 px-4 rounded-xl mb-8 font-bold flex justify-between items-center border border-red-100">
                <span>Your Score</span>
                <span className="text-xl">{loopBackData.score} <span className="text-sm font-medium opacity-70">({loopBackData.percentage}%)</span></span>
             </div>
             <button 
                onClick={acknowledgeLoopBack}
                className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
             >
                {loopBackData.loopBackStepId ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Return to Review Material
                  </>
                ) : "Continue"}
             </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 md:p-12">
        {activeStep ? (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-gray-100">
            <div className="mb-6">
              <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-full uppercase tracking-wider border border-red-100">
                Step {activeStep.step_order} of {totalSteps}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-8 leading-tight tracking-tight">
              {activeStep.title}
            </h1>
            
            {/* VIDEO OR MEDIA COMPONENT */}
            {activeStep.media_url && (
              <div className="w-full bg-black rounded-3xl mb-10 overflow-hidden shadow-lg relative aspect-video border border-gray-200">
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
        ) : (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
             <div className="text-center mb-16 md:mb-24">
                 <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 tracking-tighter">Curriculum Map</h1>
                 <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto font-medium">Select an unlocked level below to begin or continue your training.</p>
             </div>
             
             <div className="relative">
                {/* Connecting Line */}
                <div className="absolute left-10 md:left-1/2 top-10 bottom-10 w-1 bg-gray-200 rounded-full -ml-0.5 md:ml-0 md:-translate-x-1/2 z-0 opacity-50"></div>

                <div className="space-y-12 md:space-y-24">
                  {levels.map((lvl, idx) => {
                     const isEven = idx % 2 === 0;
                     return (
                       <div key={lvl.id || lvl.level_order} className={`relative z-10 flex flex-col md:flex-row items-start md:items-center ${isEven ? 'md:flex-row-reverse' : ''} gap-8 md:gap-16`}>
                          
                          {/* Circle Node */}
                          <div className={`absolute left-10 md:left-1/2 -ml-6 md:ml-0 md:-translate-x-1/2 w-12 h-12 rounded-full border-[3px] flex items-center justify-center bg-white shadow-sm transition-colors ${lvl.isUnlocked ? 'border-red-600 text-red-600' : 'border-gray-300 text-gray-400'}`}>
                             {lvl.isUnlocked ? <span className="font-black text-lg">{lvl.level_order}</span> : <LockIcon className="w-5 h-5" />}
                          </div>

                          {/* Card */}
                          <div className={`w-full md:w-1/2 pl-28 md:pl-0 ${isEven ? 'md:pr-20 text-left md:text-right' : 'md:pl-20 text-left'}`}>
                             <div className={`p-6 md:p-8 rounded-[2rem] border transition-all duration-300 ${lvl.isUnlocked ? 'bg-white border-gray-200 hover:shadow-xl hover:border-red-200' : 'bg-gray-50/50 border-gray-200 opacity-70'}`}>
                                <h3 className={`text-2xl font-black mb-3 tracking-tight ${lvl.isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>{lvl.title}</h3>
                                {lvl.description && <p className="text-sm font-medium text-gray-500 mb-6 leading-relaxed">{lvl.description}</p>}
                                
                                <div className="space-y-3">
                                  {(lvl.steps || []).map((step, sIdx) => {
                                      const isCompleted = completedStepIds.includes(step.id);
                                      const previousStepInLevel = sIdx > 0 ? lvl.steps[sIdx - 1] : null;
                                      const isStepLocked = !lvl.isUnlocked || (previousStepInLevel && !completedStepIds.includes(previousStepInLevel.id) && !isCompleted);

                                      return (
                                        <button 
                                          key={step.id}
                                          onClick={() => handleStepClick(step)}
                                          disabled={isStepLocked}
                                          className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 text-sm transition-all duration-200 ${
                                            isStepLocked ? 'opacity-60 cursor-not-allowed bg-gray-100 text-gray-500' : 
                                            isCompleted ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-100 shadow-sm' : 
                                            'bg-red-50 text-red-900 hover:bg-red-100 font-bold border border-red-200 shadow-sm hover:shadow-md'
                                          }`}
                                        >
                                           <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${isCompleted ? 'bg-emerald-200/50 text-emerald-700' : isStepLocked ? 'bg-gray-200/50 text-gray-500' : 'bg-red-200/50 text-red-700'}`}>
                                              {isCompleted ? <CheckCircleIcon className="w-5 h-5" /> : isStepLocked ? <LockIcon className="w-4 h-4" /> : getStepIcon(step.type)}
                                           </div>
                                           <span className="flex-1 truncate font-semibold">{step.title}</span>
                                           {step.is_final_assessment && <span className="text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full bg-red-600 text-white shadow-sm">Final</span>}
                                        </button>
                                      );
                                  })}
                                </div>
                             </div>
                          </div>
                       </div>
                     );
                  })}
                </div>
             </div>
          </div>
        )}
      </div>

      {activeStep && (
        <div className="border-t border-gray-200 bg-white p-4 md:px-8 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] z-10 sticky bottom-0">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button 
              onClick={() => handleStepClick(null)} // Go back to map
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
