import { LockIcon, CheckCircleIcon } from "../ModuleIcons";

export default function CurriculumMap({
  levels = [],
  completedStepIds = [],
  handleStepClick,
  getStepIcon
}) {
  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      <div className="text-center mb-16 md:mb-24">
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 tracking-tighter">Curriculum Map</h1>
        <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto font-medium">
          Select an unlocked level below to begin or continue your training.
        </p>
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
  );
}
