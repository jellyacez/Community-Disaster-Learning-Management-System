import { useState } from "react";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  File01Icon, 
  Video01Icon, 
  Task01Icon, 
  Target01Icon,
  Flag01Icon,
  Folder01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Edit01Icon,
  Delete01Icon,
  CheckmarkBadge01Icon,
  Add01Icon,
  Menu01Icon
} from "@hugeicons/core-free-icons";

export default function SequenceCanvas({ 
  stagedFlows, 
  setStagedFlows, 
  activeLevelOrder, 
  triggerFlowSequencePreview,
  handleEditStep 
}) {
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [stepToDelete, setStepToDelete] = useState(null);

  const localizedFlows = stagedFlows.filter(flow => flow.levelOrder === activeLevelOrder);

  const handleDragStart = (e, targetIndexWithinFilter) => {
    const absoluteIndex = stagedFlows.findIndex(f => f.id === localizedFlows[targetIndexWithinFilter].id);
    setDraggedItemIndex(absoluteIndex);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, targetIndexWithinFilter) => {
    e.preventDefault();
    if (draggedItemIndex === null) return;
    
    const absoluteTargetIndex = stagedFlows.findIndex(f => f.id === localizedFlows[targetIndexWithinFilter].id);
    if (draggedItemIndex === absoluteTargetIndex) return;

    const updatedFlows = [...stagedFlows];
    const itemToMove = updatedFlows[draggedItemIndex];
    updatedFlows.splice(draggedItemIndex, 1);
    updatedFlows.splice(absoluteTargetIndex, 0, itemToMove);
    
    setDraggedItemIndex(absoluteTargetIndex);
    setStagedFlows(updatedFlows);
  };

  const handleDragEnd = () => setDraggedItemIndex(null);

  const moveFlowStep = (targetIndexWithinFilter, direction) => {
    const absoluteIndex = stagedFlows.findIndex(f => f.id === localizedFlows[targetIndexWithinFilter].id);
    let relativeSiblingIndex = direction === "up" ? targetIndexWithinFilter - 1 : targetIndexWithinFilter + 1;
    if (relativeSiblingIndex < 0 || relativeSiblingIndex >= localizedFlows.length) return;

    const absoluteSiblingIndex = stagedFlows.findIndex(f => f.id === localizedFlows[relativeSiblingIndex].id);

    const updated = [...stagedFlows];
    const temp = updated[absoluteIndex];
    updated[absoluteIndex] = updated[absoluteSiblingIndex];
    updated[absoluteSiblingIndex] = temp;
    setStagedFlows(updated);
  };

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

  return (
    <div className="bg-transparent space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">
            Learning Path Sequence
          </h3>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Build the syllabus for Level {activeLevelOrder}. Add content using the builder.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-600 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <span>Set By</span>
            <select className="bg-gray-100 border-none rounded-lg px-3 py-1 text-gray-900 outline-none cursor-pointer">
              <option>Sequential</option>
              <option>Optional</option>
            </select>
          </div>
          {stagedFlows.length >= 2 && (
            <button 
              type="button" 
              onClick={triggerFlowSequencePreview} 
              className="px-4 py-2 text-sm font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors shadow-sm"
            >
              Preview Flow
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-col items-center">
        {/* Start Node */}
        <div className="flex items-center gap-3 bg-white px-6 py-2.5 rounded-full shadow-sm border border-gray-100 z-10 font-bold text-gray-800 tracking-wide">
           <HugeiconsIcon icon={Flag01Icon} className="w-5 h-5 text-gray-400" />
           Level {activeLevelOrder} Start
        </div>
        
        {localizedFlows.length === 0 ? (
          <>
            <div className="h-16 border-l-2 border-dashed border-gray-300"></div>
            <div className="text-center py-12 px-8 bg-white border-2 border-dashed border-gray-200 rounded-3xl max-w-2xl w-full mx-auto">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={Folder01Icon} className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Content Yet</h3>
              <p className="text-gray-500 max-w-sm mx-auto text-sm">Use the builder panel on the right to start adding learning materials, quizzes, and situational assessments.</p>
            </div>
          </>
        ) : (
          <div className="w-full max-w-3xl flex flex-col items-center">
            {localizedFlows.map((flow, index) => (
              <div key={flow.id} className="w-full flex flex-col items-center relative group">
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
                        <button onClick={() => moveFlowStep(index, "down")} disabled={index === localizedFlows.length - 1} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-30">
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
            ))}
            
            {/* Final Add Node connection */}
            <div className="h-10 border-l-2 border-dashed border-gray-300"></div>
            <button className="w-10 h-10 bg-white border-2 border-dashed border-gray-300 text-gray-400 rounded-full flex items-center justify-center hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all z-10 shadow-sm cursor-default" title="Use builder panel to add content">
               <HugeiconsIcon icon={Add01Icon} className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      
      <ConfirmationModal
        isOpen={!!stepToDelete}
        onClose={() => setStepToDelete(null)}
        onConfirm={() => {
          if (stepToDelete) {
            const updated = stagedFlows.filter(f => f.id !== stepToDelete.id);
            setStagedFlows(updated);
            setStepToDelete(null);
          }
        }}
        title="Delete Step"
        description={`Are you sure you want to delete the step "${stepToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Step"
        type="danger"
      />
    </div>
  );
}