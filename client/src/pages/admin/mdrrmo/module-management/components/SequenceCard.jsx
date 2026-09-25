import { HugeiconsIcon } from "@hugeicons/react";
import { 
  File01Icon, 
  Video01Icon, 
  Task01Icon, 
  Target01Icon,
  CheckmarkBadge01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Edit01Icon,
  Delete01Icon,
  Menu01Icon
} from "@hugeicons/core-free-icons";

const getIconForType = (type) => {
  switch(type) {
    case 'text': return File01Icon;
    case 'video': return Video01Icon;
    case 'quiz': return Task01Icon;
    case 'situational': return Target01Icon;
    default: return File01Icon;
  }
};

const getBadgeColorForType = (type) => {
  switch(type) {
    case 'text': return "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 dark:border dark:border-blue-800/60";
    case 'video': return "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 dark:border dark:border-purple-800/60";
    case 'quiz': return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 dark:border dark:border-emerald-800/60";
    case 'situational': return "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 dark:border dark:border-orange-800/60";
    default: return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 dark:border dark:border-slate-700";
  }
};

const extractTextFromHTML = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export default function SequenceCard({
  flow,
  index,
  activeLevelOrder,
  localizedFlowsLength,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  moveFlowStep,
  handleEditStep,
  setStepToDelete,
  moduleStatus
}) {
  return (
    <div className="w-full flex flex-col items-center relative group">
      {/* Connecting Line above card */}
      <div className="h-10 border-l-2 border-dashed border-gray-300 dark:border-slate-700 group-hover:border-gray-400 dark:group-hover:border-slate-600 transition-colors"></div>
      
      {/* Card */}
      <div 
        draggable 
        onDragStart={(e) => handleDragStart(e, index)} 
        onDragOver={(e) => handleDragOver(e, index)} 
        onDragEnd={handleDragEnd} 
        className="w-full flex items-start gap-4 p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 transition-all cursor-grab active:cursor-grabbing relative"
      >
        <div className="absolute left-[-4rem] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
          <div className="flex flex-col gap-0.5">
            <button onClick={(e) => { e.stopPropagation(); moveFlowStep(index, "up"); }} disabled={index === 0} className="p-1 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded disabled:opacity-30 transition-colors cursor-pointer">
                <HugeiconsIcon icon={ArrowUp01Icon} className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); moveFlowStep(index, "down"); }} disabled={index === localizedFlowsLength - 1} className="p-1 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded disabled:opacity-30 transition-colors cursor-pointer">
                <HugeiconsIcon icon={ArrowDown01Icon} className="w-3.5 h-3.5" />
            </button>
          </div>
          <HugeiconsIcon icon={Menu01Icon} className="w-5 h-5 text-gray-400 dark:text-slate-500" />
        </div>
        
        {/* Icon Box */}
        <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center text-white shadow-inner">
          <HugeiconsIcon icon={getIconForType(flow.type)} className="w-6 h-6" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h4 className="text-[17px] font-bold text-gray-900 dark:text-slate-100 truncate">{flow.title}</h4>
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-widest ${getBadgeColorForType(flow.type)}`}>
                {flow.type}
              </span>
              {flow.is_final_assessment && (
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-widest bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 dark:border dark:border-red-800/60 flex items-center gap-1">
                  <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-3.5 h-3.5" />
                  Final Assessment
                </span>
              )}
              {flow.type === 'situational' && flow.situationalScenarios && (
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-widest bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 dark:border dark:border-amber-800/60 flex items-center gap-1">
                  {flow.situationalScenarios.length} Scenario{flow.situationalScenarios.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-slate-400">
              <HugeiconsIcon icon={Task01Icon} className="w-4 h-4" />
              Level {activeLevelOrder} Content • Sequence #{index + 1}
            </div>
            {flow.textContent && (
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-3 line-clamp-1">{extractTextFromHTML(flow.textContent)}</p>
            )}
        </div>
        
        {/* Right Actions */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
            {moduleStatus === 'published' ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-100 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Published
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-lg border border-amber-100 dark:border-amber-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Draft Content
              </span>
            )}
            
            <div className="relative flex items-center gap-1 border-l border-gray-200 dark:border-slate-800 pl-3 ml-1">
              <button onClick={() => handleEditStep(flow.id)} className="p-2 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors cursor-pointer" title="Edit Step">
                  <HugeiconsIcon icon={Edit01Icon} className="w-5 h-5" />
              </button>
              <button onClick={() => setStepToDelete(flow)} className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer" title="Delete Step">
                  <HugeiconsIcon icon={Delete01Icon} className="w-5 h-5" />
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
