import { useMemo } from "react";
import { useScrollSpy } from "../../../../hooks/useScrollSpy";

const NAV_ITEMS = [
  { id: "module-details", label: "Module Details" },
  { id: "phases-levels", label: "Phases & Levels" },
  { id: "sequence-canvas", label: "Sequence Canvas" },
  { id: "step-builder", label: "Step Builder" }
];

export default function StickyBuilderNav({ onReset, showReset }) {
  const sectionIds = useMemo(() => NAV_ITEMS.map(item => item.id), []);
  const activeId = useScrollSpy(sectionIds, 250);

  const handleClick = (e, id) => {
    e.preventDefault();
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-slate-200 py-3 mb-8 px-2 sm:px-4 shadow-sm w-full transition-all duration-300 rounded-b-xl">
      <div className="flex items-center justify-between w-full">
        <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={(e) => handleClick(e, item.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                activeId === item.id
                  ? "bg-red-600 text-white shadow-md ring-2 ring-red-600/20"
                  : "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        
        {showReset && (
          <button
            type="button"
            onClick={onReset}
            className="whitespace-nowrap ml-4 px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-colors"
          >
            Clear / Reset
          </button>
        )}
      </div>
    </div>
  );
}
