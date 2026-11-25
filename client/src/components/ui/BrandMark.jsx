import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon } from "@hugeicons/core-free-icons";

const SIZES = {
  sm: { box: "w-8 h-8 rounded-lg", icon: "w-4 h-4" },
  md: { box: "w-10 h-10 rounded-xl", icon: "w-5 h-5" },
};

/**
 * The uploaded platform logo, or the default red shield tile.
 * Decorative (alt=""): every caller shows the system name next to it.
 * The logo sits on a white tile so a transparent dark logo stays visible in dark mode and on red.
 */
// The system name as text; an empty fixed-width slot on a first visit, so no wrong name flashes
export function BrandName({ name }) {
  if (name) return name;
  return <span className="inline-block w-32 max-w-full" aria-hidden="true">&nbsp;</span>;
}

export default function BrandMark({ logoSrc, pending = false, size = "md", className = "" }) {
  const s = SIZES[size] ?? SIZES.md;
  if (logoSrc) {
    return (
      <div className={`${s.box} shrink-0 overflow-hidden bg-white ring-1 ring-black/5 p-1 ${className}`}>
        <img src={logoSrc} alt="" className="w-full h-full object-contain" draggable="false" />
      </div>
    );
  }
  if (pending) {
    return <div className={`${s.box} shrink-0 bg-white/80 ring-1 ring-black/5 ${className}`} aria-hidden="true" />;
  }
  return (
    <div className={`${s.box} shrink-0 bg-red-600 flex items-center justify-center ${className}`}>
      <HugeiconsIcon aria-hidden="true" icon={Shield01Icon} className={`${s.icon} text-white`} />
    </div>
  );
}
