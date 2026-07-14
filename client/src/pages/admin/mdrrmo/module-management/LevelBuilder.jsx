import React from "react";

export default function LevelSelector({ 
  stagedLevels, 
  setStagedLevels, 
  activeLevelOrder, 
  setActiveLevelOrder,
  stagedFlows = [] 
}) {
  const handleAddLevel = () => {
    const nextOrder = stagedLevels.length + 1;
    setStagedLevels([
      ...stagedLevels,
      { 
        levelOrder: nextOrder, 
        levelTitle: `Phase ${nextOrder}: Advanced Procedures`, 
        levelDescription: "Advanced operational guides and checks container." 
      }
    ]);
    setActiveLevelOrder(nextOrder);
  };

  const handleUpdateLevel = (order, field, value) => {
    setStagedLevels(prev => 
      prev.map(lvl => lvl.levelOrder === order ? { ...lvl, [field]: value } : lvl)
    );
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Curriculum Phases & Levels</h3>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">Organize items into separate level blocks linked to this module.</p>
        </div>
        <button
          type="button"
          onClick={handleAddLevel}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
        >
          + Append New Level
        </button>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap gap-2">
        {stagedLevels.map((lvl) => {
          
          const stepCount = stagedFlows.filter(f => f.levelOrder === lvl.levelOrder).length;
          
          return (
            <button
              key={lvl.levelOrder}
              type="button"
              onClick={() => setActiveLevelOrder(lvl.levelOrder)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeLevelOrder === lvl.levelOrder 
                  ? "bg-gray-800 text-white shadow-sm scale-105" 
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              Level {lvl.levelOrder} ({stepCount} {stepCount === 1 ? 'Step' : 'Steps'})
            </button>
          );
        })}
      </div>

      {/* Metadata Fields for Active Level */}
      {stagedLevels.map((lvl) => lvl.levelOrder === activeLevelOrder && (
        <div key={lvl.levelOrder} className="grid grid-cols-1 gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl animate-in fade-in duration-200">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Level Container Custom Title</label>
            <input
              type="text"
              value={lvl.levelTitle}
              onChange={(e) => handleUpdateLevel(lvl.levelOrder, "levelTitle", e.target.value)}
              className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Level Container Description</label>
            <textarea
              rows="2"
              value={lvl.levelDescription}
              onChange={(e) => handleUpdateLevel(lvl.levelOrder, "levelDescription", e.target.value)}
              className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm resize-none"
            />
          </div>
        </div>
      ))}
    </div>
  );
}