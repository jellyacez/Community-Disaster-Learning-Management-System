import { useState, useRef } from "react";
import toast from "react-hot-toast";
import ConfirmationModal from "../../../../../components/ui/modals/ConfirmationModal";
import SequenceCard from "../components/SequenceCard";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Flag01Icon,
  Folder01Icon,
  Add01Icon,
  Upload04Icon,
  Delete02Icon,
  Image01Icon
} from "@hugeicons/core-free-icons";

export default function SequenceCanvas({
  stagedFlows,
  setStagedFlows,
  activeLevelOrder,
  triggerFlowSequencePreview,
  handleEditStep,
  formError,
  moduleStatus,
  currentCoverImage,
  onUpdateCoverImage
}) {
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [stepToDelete, setStepToDelete] = useState(null);
  const fileInputRef = useRef(null);

  const localizedFlows = stagedFlows.filter(
    (flow) => flow.levelOrder === activeLevelOrder
  );

  // File Upload Handler (reads file as base64 Data URL)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (onUpdateCoverImage) {
        onUpdateCoverImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    if (onUpdateCoverImage) {
      onUpdateCoverImage(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragStart = (e, targetIndexWithinFilter) => {
    const absoluteIndex = stagedFlows.findIndex(
      (f) => f.id === localizedFlows[targetIndexWithinFilter].id
    );
    setDraggedItemIndex(absoluteIndex);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, targetIndexWithinFilter) => {
    e.preventDefault();
    if (draggedItemIndex === null) return;

    const absoluteTargetIndex = stagedFlows.findIndex(
      (f) => f.id === localizedFlows[targetIndexWithinFilter].id
    );
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
    const absoluteIndex = stagedFlows.findIndex(
      (f) => f.id === localizedFlows[targetIndexWithinFilter].id
    );
    let relativeSiblingIndex =
      direction === "up"
        ? targetIndexWithinFilter - 1
        : targetIndexWithinFilter + 1;

    if (relativeSiblingIndex < 0 || relativeSiblingIndex >= localizedFlows.length)
      return;

    const absoluteSiblingIndex = stagedFlows.findIndex(
      (f) => f.id === localizedFlows[relativeSiblingIndex].id
    );

    const updated = [...stagedFlows];
    const temp = updated[absoluteIndex];
    updated[absoluteIndex] = updated[absoluteSiblingIndex];
    updated[absoluteSiblingIndex] = temp;
    setStagedFlows(updated);
  };

  return (
    <div className="bg-transparent space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            Learning Path Sequence
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mt-1">
            Build the syllabus for Level {activeLevelOrder}. Add content using
            the builder.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Flow: Sequential</span>
          </div>

          {stagedFlows.length >= 2 && (
            <button 
              type="button" 
              onClick={triggerFlowSequencePreview} 
              className="px-4 py-2 text-sm font-bold text-white bg-gray-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Preview Flow
            </button>
          )}
        </div>
      </div>

      {/* ADMIN PHOTO UPLOADER FOR ACTIVE LEVEL */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <HugeiconsIcon icon={Image01Icon} className="w-4 h-4 text-red-600" />
              Phase {activeLevelOrder} Motivator Photo
            </h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              This photo appears on the opposite side of Phase {activeLevelOrder} in the learner's Curriculum Map.
            </p>
          </div>

          {currentCoverImage && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
            >
              <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" />
              Remove Photo
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {currentCoverImage ? (
          <div className="relative w-full max-w-md h-44 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 group">
            <img
              src={currentCoverImage}
              alt={`Phase ${activeLevelOrder} Cover`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-xl text-xs font-bold shadow-md hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Change Photo
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full max-w-md h-32 border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500/60 rounded-xl bg-gray-50/70 dark:bg-slate-800/40 hover:bg-red-50/20 dark:hover:bg-red-950/20 transition cursor-pointer"
          >
            <HugeiconsIcon icon={Upload04Icon} className="w-6 h-6 text-gray-400 dark:text-slate-500 mb-1" />
            <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Upload Phase Photo</span>
            <span className="text-[10px] text-gray-400 dark:text-slate-500">PNG, JPG, or WEBP (Optional)</span>
          </button>
        )}
      </div>

      {/* Visual Sequence Flow */}
      <div className="flex flex-col items-center">
        {/* Start Node */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-6 py-2.5 rounded-full shadow-sm border border-gray-100 dark:border-slate-700 z-10 font-bold text-gray-800 dark:text-slate-200 tracking-wide">
          <HugeiconsIcon icon={Flag01Icon} className="w-5 h-5 text-gray-400 dark:text-slate-500" />
          Level {activeLevelOrder} Start
        </div>

        {localizedFlows.length === 0 ? (
          <>
            <div className="h-16 border-l-2 border-dashed border-gray-300 dark:border-slate-700"></div>
            <div
              id="sequence-error-anchor"
              className={`text-center py-12 px-8 border-2 border-dashed rounded-3xl max-w-2xl w-full mx-auto transition-colors ${
                formError
                  ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900/60"
                  : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800"
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  formError ? "bg-red-100 dark:bg-red-900/50" : "bg-red-50 dark:bg-red-950/50"
                }`}
              >
                <HugeiconsIcon
                  icon={Folder01Icon}
                  className={`w-8 h-8 ${
                    formError ? "text-red-600 dark:text-red-400" : "text-red-500 dark:text-red-400"
                  }`}
                />
              </div>
              <h3
                className={`text-lg font-bold mb-2 ${
                  formError ? "text-red-800 dark:text-red-300" : "text-gray-900 dark:text-slate-100"
                }`}
              >
                No Content Yet
              </h3>
              <p
                className={`max-w-sm mx-auto text-sm ${
                  formError ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-500 dark:text-slate-400"
                }`}
              >
                {formError ||
                  "Use the builder panel on the right to start adding learning materials, quizzes, and situational assessments."}
              </p>
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
                moduleStatus={moduleStatus}
              />
            ))}

            <div className="h-10 border-l-2 border-dashed border-gray-300 dark:border-slate-700"></div>
            <button
              className="w-10 h-10 bg-white dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-700 text-gray-400 dark:text-slate-500 rounded-full flex items-center justify-center hover:border-red-400 hover:text-red-500 dark:hover:border-red-500/60 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all z-10 shadow-sm cursor-default"
              title="Use builder panel to add content"
            >
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
            const updated = stagedFlows.filter((f) => f.id !== stepToDelete.id);
            setStagedFlows(updated);
            toast.success(`Step "${stepToDelete.title}" removed successfully`);
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