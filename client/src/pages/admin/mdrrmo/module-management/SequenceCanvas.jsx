import { useState } from "react";

export default function SequenceCanvas({ stagedFlows, setStagedFlows, triggerFlowSequencePreview }) {
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const updatedFlows = [...stagedFlows];
    const itemToMove = updatedFlows[draggedItemIndex];
    updatedFlows.splice(draggedItemIndex, 1);
    updatedFlows.splice(index, 0, itemToMove);
    setDraggedItemIndex(index);
    setStagedFlows(updatedFlows);
  };

  const handleDragEnd = () => setDraggedItemIndex(null);

  const moveFlowStep = (index, direction) => {
    const updated = [...stagedFlows];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setStagedFlows(updated);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Module Steps Order Sequence</h3>
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
        {stagedFlows.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-6">No steps added yet. Use the builder below.</p>
        ) : (
          stagedFlows.map((flow, index) => (
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
                <span className="bg-gray-200 text-gray-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">{flow.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => moveFlowStep(index, "up")} disabled={index === 0} className="px-2 py-1 bg-white border border-gray-200 text-xs rounded-md hover:bg-gray-50 disabled:opacity-50">▲</button>
                <button type="button" onClick={() => moveFlowStep(index, "down")} disabled={index === stagedFlows.length - 1} className="px-2 py-1 bg-white border border-gray-200 text-xs rounded-md hover:bg-gray-50 disabled:opacity-50">▼</button>
                <button type="button" onClick={() => {
                  const updated = stagedFlows.filter((_, i) => i !== index);
                  setStagedFlows(updated);
                }} className="text-xs font-bold text-red-600 ml-3 hover:underline">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
