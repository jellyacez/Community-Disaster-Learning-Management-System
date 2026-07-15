export default function LoopBackModal({ loopBackData, acknowledgeLoopBack }) {
  if (!loopBackData) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-200 border border-red-100">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">
          {loopBackData.isFinalAssessment ? "Assessment Failed" : "Quiz Failed"}
        </h2>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">{loopBackData.message}</p>
        <div className="bg-red-50 text-red-900 py-3 px-4 rounded-xl mb-8 font-bold flex justify-between items-center border border-red-100">
          <span>Your Score</span>
          <span className="text-xl">
            {loopBackData.score} <span className="text-sm font-medium opacity-70">({loopBackData.percentage}%)</span>
          </span>
        </div>
        <button
          onClick={acknowledgeLoopBack}
          className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
        >
          {loopBackData.loopBackStepId ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Review Material
            </>
          ) : (
            "Continue"
          )}
        </button>
      </div>
    </div>
  );
}
