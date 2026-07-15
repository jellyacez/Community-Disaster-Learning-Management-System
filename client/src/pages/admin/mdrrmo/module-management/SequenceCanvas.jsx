import { useState } from "react";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";
import SequenceCard from "./components/SequenceCard";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Flag01Icon,
  Folder01Icon,
  Add01Icon
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
              <SequenceCard 
                key={flow.id}
                flow={flow}
                index={index}
                activeLevelOrder={activeLevelOrder}
                localizedFlowsLength={localizedFlows.length}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDragEnd={handleDragEnd}
                moveFlowStep={moveFlowStep}
                handleEditStep={handleEditStep}
                setStepToDelete={setStepToDelete}
              />
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