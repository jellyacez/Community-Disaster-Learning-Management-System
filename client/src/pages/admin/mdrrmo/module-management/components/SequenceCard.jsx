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
    case 'text': return "bg-blue-100 text-blue-700";
    case 'video': return "bg-purple-100 text-purple-700";
    case 'quiz': return "bg-emerald-100 text-emerald-700";
    case 'situational': return "bg-orange-100 text-orange-700";
    default: return "bg-gray-100 text-gray-700";
  }
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
  setStepToDelete
}) {
  return (
    <div className="w-full flex flex-col items-center relative group">
      {/* Connecting Line above card */}
      <div className="h-10 border-l-2 border-dashed border-gray-300 group-hover:border-red-400 transition-colors"></div>
      
      {/* Card */}
      <div 
        draggable 
        onDragStart={(e) => handleDragStart(e, index)} 
        onDragOver={(e) => handleDragOver(e, index)} 
        onDragEnd={handleDragEnd} 
        className="w-full flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-red-200 transition-all cursor-grab active:cursor-grabbing relative"
      >
        <div className="absolute left-[-2rem] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <HugeiconsIcon icon={Menu01Icon} className="w-5 h-5 text-gray-400" />
        </div>
        
        {/* Icon Box */}
        <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center text-white shadow-inner">
          <HugeiconsIcon icon={getIconForType(flow.type)} className="w-6 h-6" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h4 className="text-[17px] font-bold text-gray-900 truncate">{flow.title}</h4>
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-widest ${getBadgeColorForType(flow.type)}`}>
                {flow.type}
              </span>
              {flow.is_final_assessment && (
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-widest bg-red-100 text-red-700 flex items-center gap-1">
                  <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-3.5 h-3.5" />
                  Final Assessment
                </span>
              )}
              {flow.type === 'situational' && flow.situationalScenarios && (
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-widest bg-amber-100 text-amber-700 flex items-center gap-1">
                  {flow.situationalScenarios.length} Scenario{flow.situationalScenarios.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <HugeiconsIcon icon={Task01Icon} className="w-4 h-4" />
              Level {activeLevelOrder} Content • Sequence #{index + 1}
            </div>
            {flow.textContent && (
              <p className="text-sm text-gray-600 mt-3 line-clamp-1">{flow.textContent.replace(/<[^>]*>?/gm, '')}</p>
            )}
        </div>
        
        {/* Right Actions */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Published
            </span>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => moveFlowStep(index, "up")} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-30">
                  <HugeiconsIcon icon={ArrowUp01Icon} className="w-4 h-4" />
              </button>
              <button onClick={() => moveFlowStep(index, "down")} disabled={index === localizedFlowsLength - 1} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-30">
                  <HugeiconsIcon icon={ArrowDown01Icon} className="w-4 h-4" />
              </button>
            </div>
            
            <div className="relative flex items-center gap-1">
              <button onClick={() => handleEditStep(flow.id)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Edit Step">
                  <HugeiconsIcon icon={Edit01Icon} className="w-5 h-5" />
              </button>
              <button onClick={() => setStepToDelete(flow)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Delete Step">
                  <HugeiconsIcon icon={Delete01Icon} className="w-5 h-5" />
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
