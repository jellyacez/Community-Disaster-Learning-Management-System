import React from "react";

export default function ModuleViewerContent({
  activeStep,
  totalSteps,
  handlePrevious,
  handleCompleteAndContinue
}) {
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
              
              {/* Content Placeholder Box */}
              <div className="aspect-video w-full bg-gray-900 rounded-2xl mb-8 flex items-center justify-center overflow-hidden shadow-lg relative group">
                 {activeStep.type === "video" ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center pl-1 shadow-xl group-hover:scale-110 transition-transform cursor-pointer">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                     </div>
                   </div>
                 ) : activeStep.type === "quiz" ? (
                   <p className="text-white/60 font-bold tracking-widest uppercase">Interactive Quiz Canvas</p>
                 ) : (
                   <p className="text-white/60 font-bold tracking-widest uppercase">Rich Text / PDF Viewer</p>
                 )}
              </div>

              <div className="prose prose-lg prose-red max-w-none text-gray-600">
                <p>{activeStep.content}</p>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-gray-500">Select a lesson from the curriculum</div>
          )}
        </div>
      </div>

      {/* Persistent Bottom Action Bar */}
      <div className="border-t border-gray-200 bg-white p-4 md:px-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 sticky bottom-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button 
            onClick={handlePrevious}
            disabled={!activeStep || activeStep.step_order === 1}
            className="px-5 py-3 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Previous
          </button>
          <button 
            onClick={handleCompleteAndContinue}
            className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow-md shadow-red-600/20 transition flex items-center gap-2"
          >
            {activeStep?.step_order === totalSteps ? "Complete Module" : "Complete & Continue"}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
