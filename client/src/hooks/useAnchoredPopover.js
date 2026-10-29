import { useEffect, useRef, useState } from "react";

/**
 * Positions a portalled panel under its trigger button and closes it on Escape or an outside click.
 * `align` pins the panel to the trigger's "left" or "right" edge.
 */
export function useAnchoredPopover(isOpen, setIsOpen, align = "right") {
  const wrapperRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const [position, setPosition] = useState({ top: 72, left: 12, width: 320 });

  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(window.innerWidth - 24, window.innerWidth >= 768 ? 384 : 320);
      const anchor = align === "left" ? rect.left : rect.right - width;
      setPosition({
        top: Math.max(12, Math.min(rect.bottom + 10, window.innerHeight - 120)),
        left: Math.max(12, Math.min(anchor, window.innerWidth - width - 12)),
        width,
      });
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const scrollOptions = { capture: true, passive: true };
    update();
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, scrollOptions);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, scrollOptions);
      document.removeEventListener("keydown", escape);
    };
  }, [isOpen, setIsOpen, align]);

  // Only listen for outside clicks while open
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [isOpen, setIsOpen]);

  return { wrapperRef, panelRef, triggerRef, position };
}
