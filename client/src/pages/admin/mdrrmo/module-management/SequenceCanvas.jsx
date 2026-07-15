import { useState } from "react";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";

export default function SequenceCanvas({ 
  stagedFlows, 
  setStagedFlows, 
  activeLevelOrder, 
  triggerFlowSequencePreview 
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

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Steps Sequence (Level {activeLevelOrder})
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Drag rows or use arrow buttons to arrange sequencing within this phase.
          </p>
        </div>
        {stagedFlows.length >= 2 && (
          <button 
            type="button" 
            onClick={triggerFlowSequencePreview} 
            className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white rounded-lg transition-colors shadow-sm"
          >
            Preview Flow Blueprint
          </button>
        )}
      </div>
      <div className="space-y-3">
        {localizedFlows.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-6">
            No micro-learning steps added to Level {activeLevelOrder} yet. Use the builder utility below.
          </p>
        ) : (
          localizedFlows.map((flow, index) => (
            <div 
              key={flow.id} 
              draggable 
              onDragStart={(e) => handleDragStart(e, index)} 
              onDragOver={(e) => handleDragOver(e, index)} 
              onDragEnd={handleDragEnd} 
              className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm shadow-sm cursor-grab active:cursor-grabbing hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-slate-400 cursor-grab">☰</span>
                <span className="font-semibold text-slate-800">{flow.title}</span>
                <span className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">
                  {flow.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => moveFlowStep(index, "up")} 
                  disabled={index === 0} 
                  className="px-2 py-1 bg-white border border-slate-200 text-xs rounded-md hover:bg-slate-50 disabled:opacity-50"
                >
                  ▲
                </button>
                <button 
                  type="button" 
                  onClick={() => moveFlowStep(index, "down")} 
                  disabled={index === localizedFlows.length - 1} 
                  className="px-2 py-1 bg-white border border-slate-200 text-xs rounded-md hover:bg-slate-50 disabled:opacity-50"
                >
                  ▼
                </button>
                <button 
                  type="button" 
                  onClick={() => setStepToDelete(flow)} 
                  className="text-xs font-bold text-red-600 ml-3 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
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