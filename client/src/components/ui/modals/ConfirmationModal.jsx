import { memo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert01Icon,
  Cancel01Icon,
  CheckmarkBadge01Icon,
  Book02Icon,
} from "@hugeicons/core-free-icons";

const ConfirmationModal = memo(function ConfirmationModal({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  description,
  message,
  confirmText,
  confirmLabel,
  cancelText = "Cancel",
  alternateText,
  onAlternateAction,
  type = "warning", // "warning" | "success" | "danger" | "primary"
  icon,
  children,
  isLoading = false,
}) {
  const handleClose = onClose || onCancel || (() => {});
  const modalDescription = description || message;
  const modalConfirmText = confirmText || confirmLabel || "Confirm";

  const dialogRef = useRef(null);

  // Move focus into the dialog, keep Tab inside it, and give focus back when it closes
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement;
    const getFocusable = () =>
      [...(dialogRef.current?.querySelectorAll("button:not([disabled]), a[href], input, select, textarea") || [])];
    // Start on the least drastic action: Cancel when there is one, otherwise the acknowledge button
    (dialogRef.current?.querySelector("[data-initial-focus]") || getFocusable()[1])?.focus();
    const trapTab = (e) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapTab);
    return () => {
      document.removeEventListener("keydown", trapTab);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  // Keyboard shortcut: Escape to cancel
  useEffect(() => {
    if (!isOpen || isLoading) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (onClose) onClose();
        else if (onCancel) onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose, onCancel]);

  if (!isOpen) return null;

  const getIcon = () => {
    if (icon) return icon;
    switch (type) {
      case "success":
        return CheckmarkBadge01Icon;
      case "danger":
        return Alert01Icon;
      case "primary":
        return Book02Icon;
      default:
        return Alert01Icon;
    }
  };

  const getColors = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-100 dark:bg-emerald-950/60",
          text: "text-green-600 dark:text-emerald-400",
          button:
            "bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 focus:ring-green-500",
        };
      case "danger":
        return {
          bg: "bg-red-100 dark:bg-red-950/60",
          text: "text-red-600 dark:text-red-400",
          button:
            "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 focus:ring-red-500",
        };
      case "primary":
        return {
          bg: "bg-red-50 dark:bg-red-950/40",
          text: "text-red-600 dark:text-red-400",
          button:
            "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 focus:ring-red-500",
        };
      default:
        return {
          bg: "bg-yellow-100 dark:bg-amber-950/60",
          text: "text-yellow-600 dark:text-amber-400",
          button:
            "bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700 focus:ring-amber-600",
        };
    }
  };

  const colors = getColors();

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-desc"
        className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200 motion-reduce:animate-none"
      >
        <button
          onClick={handleClose}
          disabled={isLoading}
          aria-label="Close"
          className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          <HugeiconsIcon
            aria-hidden="true"
            icon={Cancel01Icon}
            className="w-5 h-5"
          />
        </button>

        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${colors.bg}`}
          >
            <HugeiconsIcon
              aria-hidden="true"
              icon={getIcon()}
              className={`w-6 h-6 ${colors.text}`}
            />
          </div>

          <h2
            id="confirmation-modal-title"
            className="mb-2 text-xl font-bold text-gray-900 dark:text-white"
          >
            {title}
          </h2>
          {modalDescription && (
            <p
              id="confirmation-modal-desc"
              className="mb-6 text-sm leading-relaxed text-gray-500 dark:text-slate-400"
            >
              {modalDescription}
            </p>
          )}
          {children && <div className="w-full mb-6 text-left">{children}</div>}

          <div className="flex w-full gap-3">
            {/* Pass cancelText={null} for a notice that only needs acknowledging */}
            {cancelText && (
              <button
                data-initial-focus
                onClick={handleClose}
                disabled={isLoading}
                className="w-full min-h-11 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-slate-300 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
            )}
            <button
              data-initial-focus={cancelText ? undefined : true}
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full min-h-11 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed ${colors.button}`}
            >
              {isLoading ? "Processing..." : modalConfirmText}
            </button>
          </div>
          {alternateText && onAlternateAction && (
            <div className="w-full mt-3">
              <button
                onClick={onAlternateAction}
                disabled={isLoading}
                className="w-full rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 transition-colors"
              >
                {alternateText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
});

export default ConfirmationModal;
