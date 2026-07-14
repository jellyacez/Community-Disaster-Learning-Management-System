import { useState } from "react";

export default function SequenceCanvas({ 
  stagedFlows, 
  setStagedFlows, 
  activeLevelOrder, 
  triggerFlowSequencePreview 
}) {
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

 
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
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
            Steps Sequence (Level {activeLevelOrder})
          </h3>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
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
          <p className="text-sm text-gray-400 italic text-center py-6">
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
              className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm cursor-grab active:cursor-grabbing hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-gray-400 cursor-grab">☰</span>
                <span className="font-semibold text-gray-800">{flow.title}</span>
                <span className="bg-gray-200 text-gray-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">
                  {flow.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => moveFlowStep(index, "up")} 
                  disabled={index === 0} 
                  className="px-2 py-1 bg-white border border-gray-200 text-xs rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  ▲
                </button>
                <button 
                  type="button" 
                  onClick={() => moveFlowStep(index, "down")} 
                  disabled={index === localizedFlows.length - 1} 
                  className="px-2 py-1 bg-white border border-gray-200 text-xs rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  ▼
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const updated = stagedFlows.filter(f => f.id !== flow.id);
                    setStagedFlows(updated);
                  }} 
                  className="text-xs font-bold text-red-600 ml-3 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}