import { CheckCircleIcon, LockIcon, PlayIcon, DocumentIcon, QuizIcon, CloseIcon } from "./ModuleIcons";

export default function ModuleViewerSidebar({
  module,
  steps,
  currentProgressOrder,
  activeStepId,
  isSidebarOpen,
  setIsSidebarOpen,
  handleStepClick,
  progressPercentage,
  navigate
}) {
  const getStepIcon = (type) => {
    switch(type) {
      case "video": return <PlayIcon />;
      case "quiz": return <QuizIcon />;
      default: return <DocumentIcon />;
    }
  };

  return (
    <aside className={`
      fixed inset-y-0 right-0 z-40 w-80 bg-white border-l border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
      md:relative md:translate-x-0 md:w-80 md:border-l-0 md:border-r md:shadow-none
      ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}
    `}>
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 line-clamp-2">{module.title}</h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-red-600 transition-all duration-700 ease-out absolute left-0 top-0 bottom-0"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-600">{progressPercentage}%</span>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden ml-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg shrink-0">
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Course Contents</p>
        
        {steps.map((step) => {
          const isLocked = step.step_order > currentProgressOrder + 1;
          const isActive = step.id === activeStepId;

          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(step)}
              disabled={isLocked}
              className={`
                w-full text-left px-4 py-3 rounded-xl flex items-start gap-3 transition-all duration-200
                ${isActive ? "bg-red-50 border border-red-200 shadow-sm" : "border border-transparent hover:bg-gray-50"}
                ${isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="shrink-0 mt-0.5">
                {isCompleted ? <CheckCircleIcon /> : isLocked ? <LockIcon /> : getStepIcon(step.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold line-clamp-2 ${isActive ? "text-red-900" : "text-gray-700"}`}>
                  {step.step_order}. {step.title}
                </p>
                <p className="text-xs text-gray-500 capitalize mt-0.5">{step.type}</p>
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="hidden md:block p-4 border-t border-gray-100 bg-gray-50">
         <button onClick={() => navigate("/userDashboard")} className="w-full py-2.5 px-4 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition flex justify-center items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Exit to Dashboard
        </button>
      </div>
    </aside>
  );
}
