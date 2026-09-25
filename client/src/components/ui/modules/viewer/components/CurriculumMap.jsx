import { LockIcon, CheckCircleIcon } from "../ModuleIcons";
import DOMPurify from "dompurify";
import { decodeHtml } from "../../../../../utils/textUtils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Shield01Icon,
  FireIcon,
  WaterEnergyIcon,
  Target02Icon,
  Flag01Icon,
} from "@hugeicons/core-free-icons";

// Thematic DRRM fallbacks when no custom photo is uploaded
const LEVEL_PLACEHOLDER_ICONS = [
  Shield01Icon,
  Target02Icon,
  FireIcon,
  WaterEnergyIcon,
  Flag01Icon,
];

export default function CurriculumMap({
  levels = [],
  completedStepIds = [],
  handleStepClick,
  getStepIcon,
  isPreviewMode = false,
}) {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-4">
      {/* Header */}
      <div className="text-center mb-14 md:mb-20">
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-3 tracking-tighter">
          Curriculum Map
        </h1>
        <p className="text-gray-500 dark:text-slate-400 text-base md:text-lg max-w-xl mx-auto font-medium">
          Select an unlocked level below to begin or continue your training.
        </p>
      </div>

      <div className="relative">
        {/* Center Connecting Line */}
        <div className="absolute left-6 md:left-1/2 top-8 bottom-8 w-1 bg-gray-200 dark:bg-slate-700 rounded-full -ml-0.5 md:ml-0 md:-translate-x-1/2 z-0 opacity-60 dark:opacity-80" />

        <div className="space-y-16 md:space-y-24">
          {levels.map((lvl, idx) => {
            // idx 0 (C1): Card Right, Image Left
            // idx 1 (C2): Card Left, Image Right
            const isEven = idx % 2 === 0;
            const isLevelUnlocked = lvl.isUnlocked || isPreviewMode;
            const coverImg = lvl.cover_image || lvl.coverImage;

            const FallbackIcon =
              LEVEL_PLACEHOLDER_ICONS[idx % LEVEL_PLACEHOLDER_ICONS.length] ||
              Shield01Icon;

            return (
              <div
                key={lvl.id || lvl.level_order || idx}
                className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-0"
              >
                {/* 1. Center Circle Node */}
                <div
                  className={`absolute left-6 md:left-1/2 -ml-6 md:ml-0 md:-translate-x-1/2 w-12 h-12 rounded-full border-[3px] flex items-center justify-center bg-white dark:bg-slate-900 shadow-md z-20 transition-all ${
                    isLevelUnlocked
                      ? "border-red-600 text-red-600 ring-4 ring-red-50 dark:ring-red-950/40"
                      : "border-gray-300 dark:border-slate-700 text-gray-400 dark:text-slate-500"
                  }`}
                >
                  {isLevelUnlocked ? (
                    <span className="font-black text-base">{lvl.level_order}</span>
                  ) : (
                    <LockIcon className="w-4 h-4" />
                  )}
                </div>

                {/* 2. LEFT SIDE CONTAINER */}
                <div className="w-full md:w-1/2 pl-16 md:pl-0 md:pr-14 flex justify-center md:justify-end">
                  {!isEven ? (
                    /* C2, C4, C6... Main Card on Left */
                    <LevelContentCard
                      lvl={lvl}
                      idx={idx}
                      isLevelUnlocked={isLevelUnlocked}
                      completedStepIds={completedStepIds}
                      handleStepClick={handleStepClick}
                      getStepIcon={getStepIcon}
                      isPreviewMode={isPreviewMode}
                    />
                  ) : (
                    /* C1, C3, C5... Opposite Image on Left */
                    <LevelOppositeImage
                      coverImg={coverImg}
                      lvl={lvl}
                      idx={idx}
                      isLevelUnlocked={isLevelUnlocked}
                      FallbackIcon={FallbackIcon}
                      alignment="left"
                    />
                  )}
                </div>

                {/* 3. RIGHT SIDE CONTAINER */}
                <div className="w-full md:w-1/2 pl-16 md:pl-14 flex justify-center md:justify-start">
                  {isEven ? (
                    /* C1, C3, C5... Main Card on Right */
                    <LevelContentCard
                      lvl={lvl}
                      idx={idx}
                      isLevelUnlocked={isLevelUnlocked}
                      completedStepIds={completedStepIds}
                      handleStepClick={handleStepClick}
                      getStepIcon={getStepIcon}
                      isPreviewMode={isPreviewMode}
                    />
                  ) : (
                    /* C2, C4, C6... Opposite Image on Right */
                    <LevelOppositeImage
                      coverImg={coverImg}
                      lvl={lvl}
                      idx={idx}
                      isLevelUnlocked={isLevelUnlocked}
                      FallbackIcon={FallbackIcon}
                      alignment="right"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * The Opposite Side Motivational Image / Placeholder Card
 */
function LevelOppositeImage({
  coverImg,
  lvl,
  idx,
  isLevelUnlocked,
  FallbackIcon,
}) {
  return (
    <div
      className={`w-full max-w-sm sm:max-w-md h-56 sm:h-72 rounded-[2rem] p-3 transition-all duration-300 ${
        isLevelUnlocked
          ? "bg-white/80 dark:bg-slate-900/80 border border-gray-200/80 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-red-200 dark:hover:border-red-800/60 group"
          : "bg-gray-50/50 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800 opacity-60 grayscale"
      }`}
    >
      <div className="w-full h-full rounded-[1.5rem] overflow-hidden relative flex flex-col items-center justify-center bg-gradient-to-br from-red-500/10 via-rose-500/5 to-amber-500/10 border border-black/5 dark:border-white/5">
        {coverImg ? (
          <>
            <img
              src={coverImg}
              alt={lvl.title || `Phase ${lvl.level_order || idx + 1}`}
              className={`w-full h-full object-cover transition-transform duration-500 ${
                isLevelUnlocked ? "group-hover:scale-105" : ""
              }`}
            />
            {/* Subtle Gradient Pill Overlay */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-bold tracking-wider uppercase border border-white/10 shadow-sm">
              Phase {lvl.level_order || idx + 1} Motivator
            </div>
          </>
        ) : (
          /* Visual Placeholder when no photo is uploaded yet */
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xs transition-colors ${
                isLevelUnlocked
                  ? "bg-red-600 text-white shadow-red-200 dark:shadow-red-950/40"
                  : "bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500"
              }`}
            >
              <HugeiconsIcon icon={FallbackIcon} className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-red-600/80 dark:text-red-400">
                Phase {lvl.level_order || idx + 1}
              </span>
              <h4 className="text-base font-extrabold text-gray-800 dark:text-slate-100 tracking-tight mt-0.5">
                {decodeHtml(lvl.title)}
              </h4>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The Interactive Phase Step List Card
 */
function LevelContentCard({
  lvl,
  idx,
  isLevelUnlocked,
  completedStepIds,
  handleStepClick,
  getStepIcon,
  isPreviewMode,
}) {
  return (
    <div
      className={`w-full max-w-sm sm:max-w-md p-6 sm:p-7 rounded-[2rem] border transition-all duration-300 ${
        isLevelUnlocked
          ? "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:shadow-xl hover:border-red-200 dark:hover:border-red-800/60 shadow-sm"
          : "bg-gray-50/50 dark:bg-slate-900/40 border-gray-200 dark:border-slate-800 opacity-70"
      }`}
    >
      {/* Title & Phase Badge Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="px-3 py-1 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/50 font-black text-xs uppercase tracking-wider">
          Phase {lvl.level_order || idx + 1}
        </div>
        <h3
          className={`text-xl sm:text-2xl font-black tracking-tight truncate ${
            isLevelUnlocked ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-slate-500"
          }`}
        >
          {decodeHtml(lvl.title)}
        </h3>
      </div>

      {/* Description */}
      {lvl.description && (
        <div
          className="text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400 mb-5 leading-relaxed prose prose-sm dark:prose-invert max-w-none [&>p]:m-0"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(lvl.description),
          }}
        />
      )}

      {/* Steps List */}
      <div className="space-y-2.5">
        {(lvl.steps || []).map((step, sIdx) => {
          const isCompleted = completedStepIds.includes(step.id);
          const previousStepInLevel = sIdx > 0 ? lvl.steps[sIdx - 1] : null;
          const isStepLocked = isPreviewMode
            ? false
            : !isLevelUnlocked ||
              (previousStepInLevel &&
                !completedStepIds.includes(previousStepInLevel.id) &&
                !isCompleted);

          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(step)}
              disabled={isStepLocked}
              className={`w-full text-left px-4 py-3.5 rounded-2xl flex items-center gap-3.5 text-sm transition-all duration-200 ${
                isStepLocked
                  ? "opacity-60 cursor-not-allowed bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                  : isCompleted
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800/50 shadow-xs cursor-pointer"
                  : "bg-red-50/60 dark:bg-red-950/30 text-red-950 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-950/50 font-bold border border-red-100 dark:border-red-900/50 shadow-xs hover:shadow-md cursor-pointer"
              }`}
            >
              <div
                className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full ${
                  isCompleted
                    ? "bg-emerald-200/50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                    : isStepLocked
                    ? "bg-gray-200/50 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                    : "bg-red-200/50 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                }`}
              >
                {isCompleted ? (
                  <CheckCircleIcon className="w-4 h-4" />
                ) : isStepLocked ? (
                  <LockIcon className="w-3.5 h-3.5" />
                ) : (
                  getStepIcon(step.type)
                )}
              </div>

              <span className="flex-1 truncate font-semibold">
                {decodeHtml(step.title)}
              </span>

              {step.is_final_assessment && (
                <span className="text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-xs">
                  Final
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}