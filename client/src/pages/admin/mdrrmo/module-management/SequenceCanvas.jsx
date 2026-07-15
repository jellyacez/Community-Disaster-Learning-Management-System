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

  const getIconForType = (type) => {
    switch(type) {
      case 'text': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />;
      case 'video': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />;
      case 'quiz': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
      case 'situational': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />;
      default: return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
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
           <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
           Level {activeLevelOrder} Start
        </div>
        
        {localizedFlows.length === 0 ? (
          <>
            <div className="h-16 border-l-2 border-dashed border-gray-300"></div>
            <div className="text-center py-12 px-8 bg-white border-2 border-dashed border-gray-200 rounded-3xl max-w-2xl w-full mx-auto">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
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
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                  </div>
                  
                  {/* Icon Box */}
                  <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center text-white shadow-inner">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {getIconForType(flow.type)}
                    </svg>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-[17px] font-bold text-gray-900 truncate">{flow.title}</h4>
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-widest ${getBadgeColorForType(flow.type)}`}>
                          {flow.type}
                        </span>
                     </div>
                     <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button onClick={() => moveFlowStep(index, "down")} disabled={index === localizedFlows.length - 1} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-30">
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                     </div>
                     
                     <div className="relative">
                        <button onClick={() => setStepToDelete(flow)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Delete Step">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                     </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Final Add Node connection */}
            <div className="h-10 border-l-2 border-dashed border-gray-300"></div>
            <button className="w-10 h-10 bg-white border-2 border-dashed border-gray-300 text-gray-400 rounded-full flex items-center justify-center hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all z-10 shadow-sm cursor-default" title="Use builder panel to add content">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
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