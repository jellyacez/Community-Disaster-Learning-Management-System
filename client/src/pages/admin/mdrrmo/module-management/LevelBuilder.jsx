import { useState } from "react";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";

export default function LevelSelector({
  stagedLevels,
  setStagedLevels,
  activeLevelOrder,
  setActiveLevelOrder,
  stagedFlows = [],
  setStagedFlows,
}) {
  const [levelToDelete, setLevelToDelete] = useState(null);

  const handleAddLevel = () => {
    const nextOrder =
      stagedLevels.reduce((max, lvl) => Math.max(max, lvl.levelOrder), 0) + 1;
    setStagedLevels([
      ...stagedLevels,
      {
        levelOrder: nextOrder,
        levelTitle: "",
        levelDescription: "",
        passing_threshold: 80,
        is_locked_by_default: true
      },
    ]);
    setActiveLevelOrder(nextOrder);
  };

  const handleUpdateLevel = (levelOrder, field, value) => {
    let finalValue = value;
    if (field === "passing_threshold") {
      finalValue = parseInt(value, 10);
      if (isNaN(finalValue)) finalValue = 0;
      if (finalValue < 0) finalValue = 0;
      if (finalValue > 100) finalValue = 100;
    }
    setStagedLevels((prev) =>
      prev.map((lvl) =>
        lvl.levelOrder === levelOrder ? { ...lvl, [field]: finalValue } : lvl,
      ),
    );
  };

  const activeLevelData = stagedLevels.find(
    (l) => l.levelOrder === activeLevelOrder,
  );

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Curriculum Phases & Levels
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Organize items into separate level blocks linked to this module.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeLevelOrder === 1 ? (
            <button
              type="button"
              onClick={() => {
                const lvl = stagedLevels.find((l) => l.levelOrder === 1);
                if (lvl) setLevelToDelete(lvl);
              }}
              className="px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-colors uppercase tracking-wide"
            >
              Clear Level 1
            </button>
          ) : (
            activeLevelOrder && (
              <button
                type="button"
                onClick={() => {
                  const lvl = stagedLevels.find(
                    (l) => l.levelOrder === activeLevelOrder,
                  );
                  if (lvl) setLevelToDelete(lvl);
                }}
                className="px-3 py-1.5 text-[11px] font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg shadow-sm transition-colors uppercase tracking-wide"
              >
                Delete Active Level
              </button>
            )
          )}
          <button
            type="button"
            onClick={handleAddLevel}
            className="px-3 py-1.5 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors uppercase tracking-wide"
          >
            + Append New Level
          </button>
        </div>
      </div>

      {/* Level Tabs */}
      <div className="flex items-center flex-wrap gap-2 pt-2">
        {stagedLevels.map((lvl) => {
          const stepCount = stagedFlows.filter(
            (f) => f.levelOrder === lvl.levelOrder,
          ).length;

          return (
            <button
              key={lvl.levelOrder}
              type="button"
              onClick={() => setActiveLevelOrder(lvl.levelOrder)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeLevelOrder === lvl.levelOrder
                  ? "bg-slate-800 text-white shadow-sm scale-105"
                  : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Level {lvl.levelOrder} ({stepCount}{" "}
              {stepCount === 1 ? "Step" : "Steps"})
            </button>
          );
        })}
      </div>

      {/* Metadata Fields for Active Level */}
      {activeLevelData && (
        <div
          key={activeLevelData.levelOrder}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in duration-200"
        >
          <div className="space-y-4 md:col-span-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Level Container Custom Title
              </label>
              <input
                type="text"
                value={activeLevelData.levelTitle}
                onChange={(e) =>
                  handleUpdateLevel(
                    activeLevelData.levelOrder,
                    "levelTitle",
                    e.target.value,
                  )
                }
                placeholder="e.g. Phase 1: Basic Awareness"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Level Container Description
              </label>
              <input
                type="text"
                value={activeLevelData.levelDescription}
                onChange={(e) =>
                  handleUpdateLevel(
                    activeLevelData.levelOrder,
                    "levelDescription",
                    e.target.value,
                  )
                }
                placeholder="e.g. Fundamental concepts container."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Passing Threshold (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={activeLevelData.passing_threshold || 0}
              onChange={(e) =>
                handleUpdateLevel(
                  activeLevelData.levelOrder,
                  "passing_threshold",
                  e.target.value,
                )
              }
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
            />
          </div>
          <div className="flex items-center space-x-3 mt-4">
            <input
              type="checkbox"
              id={`lock-default-${activeLevelData.levelOrder}`}
              checked={activeLevelData.is_locked_by_default}
              onChange={(e) =>
                handleUpdateLevel(
                  activeLevelData.levelOrder,
                  "is_locked_by_default",
                  e.target.checked,
                )
              }
              className="w-5 h-5 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
            />
            <label
              htmlFor={`lock-default-${activeLevelData.levelOrder}`}
              className="text-sm font-bold text-slate-700 cursor-pointer select-none"
            >
              Lock by default (Unlock sequentially)
            </label>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!levelToDelete}
        onClose={() => setLevelToDelete(null)}
        onConfirm={() => {
          if (levelToDelete) {
            if (levelToDelete.levelOrder === 1) {
              // Clear Level 1
              const updatedLevels = stagedLevels.map((l) =>
                l.levelOrder === 1
                  ? {
                      ...l,
                      levelTitle: "",
                      levelDescription: "",
                      passing_threshold: 80,
                      is_locked_by_default: false,
                    }
                  : l,
              );
              setStagedLevels(updatedLevels);

              if (setStagedFlows) {
                const updatedFlows = stagedFlows.filter(
                  (f) => f.levelOrder !== 1,
                );
                setStagedFlows(updatedFlows);
              }
              setLevelToDelete(null);
            } else {
              // Delete the level
              const updatedLevels = stagedLevels.filter(
                (l) => l.levelOrder !== levelToDelete.levelOrder,
              );
              setStagedLevels(updatedLevels);

              // Delete all steps associated with this level
              if (setStagedFlows) {
                const updatedFlows = stagedFlows.filter(
                  (f) => f.levelOrder !== levelToDelete.levelOrder,
                );
                setStagedFlows(updatedFlows);
              }

              // Switch active level
              setActiveLevelOrder(updatedLevels[0]?.levelOrder || null);
              setLevelToDelete(null);
            }
          }
        }}
        title={
          levelToDelete?.levelOrder === 1 ? "Clear Level 1" : "Delete Level"
        }
        description={
          levelToDelete?.levelOrder === 1
            ? "Are you sure you want to clear Level 1? Its title, description, and all micro-learning steps inside it will be wiped."
            : `Are you sure you want to delete Level ${levelToDelete?.levelOrder}? This will also permanently delete all steps contained within this level.`
        }
        confirmText={
          levelToDelete?.levelOrder === 1
            ? "Clear Level 1 Data"
            : "Delete Level & Steps"
        }
        type="danger"
      />
    </div>
  );
}
