import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon } from "@hugeicons/core-free-icons";

const SIZES = {
  sm: { box: "w-8 h-8 rounded-lg", icon: "w-4 h-4" },
  md: { box: "w-10 h-10 rounded-xl", icon: "w-5 h-5" },
};

// The system name as text; an empty fixed-width slot on a first visit, so no wrong name flashes
export function BrandName({ name }) {
  if (name) return name;
  return <span className="inline-block w-32 max-w-full" aria-hidden="true">&nbsp;</span>;
}

/**
 * The uploaded platform logo, or the default red shield tile.
 * Decorative (alt=""): every caller shows the system name next to it.
 * The logo sits on a white tile so a transparent dark logo stays visible in dark mode and on red;
 * dark:bg-white opts out of the global dark remap of .bg-white (styles/index.css).
 * Each state remounts (key) with no transition, so the global background-color fade never shows red behind a logo.
 * onBrand: the default shield inverts (white tile, red mark) where the background is already brand red.
 */
export default function BrandMark({ logoSrc, pending = false, size = "md", onBrand = false, className = "" }) {
  const s = SIZES[size] ?? SIZES.md;
  if (logoSrc) {
    return (
      <div key="logo" className={`${s.box} shrink-0 transition-none overflow-hidden bg-white dark:bg-white ring-1 ring-black/5 p-1 ${className}`}>
        <img src={logoSrc} alt="" className="w-full h-full object-contain" draggable="false" />
      </div>
    );
  }
  if (pending) {
    return <div key="pending" className={`${s.box} shrink-0 transition-none bg-gray-100 dark:bg-slate-700 ring-1 ring-black/5 ${className}`} aria-hidden="true" />;
  }
  return (
    <div key="default" className={`${s.box} shrink-0 transition-none flex items-center justify-center ${onBrand ? "bg-white dark:bg-white" : "bg-red-600"} ${className}`}>
      <HugeiconsIcon aria-hidden="true" icon={Shield01Icon} className={`${s.icon} ${onBrand ? "text-red-700" : "text-white"}`} />
    </div>
  );
}
