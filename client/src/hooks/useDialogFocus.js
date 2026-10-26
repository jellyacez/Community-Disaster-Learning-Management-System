import { useEffect, useRef } from "react";

// Moves focus into an open dialog, keeps Tab inside it, closes it on Escape,
// stops the page behind it from scrolling, and gives focus back when it closes.
export default function useDialogFocus(isOpen, onClose, { canClose = true } = {}) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);
  useEffect(() => {
    onCloseRef.current = onClose;
    canCloseRef.current = canClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusable = () =>
      [...(dialog?.querySelectorAll('button:not([disabled]), a[href], input, select, textarea, iframe, [tabindex="0"]') || [])];
    (dialog?.querySelector("[data-initial-focus]") || dialog)?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && canCloseRef.current) {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return dialogRef;
}
