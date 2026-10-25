import { memo, useEffect } from "react";
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
            "bg-yellow-600 hover:bg-yellow-700 dark:bg-amber-600 dark:hover:bg-amber-700 focus:ring-yellow-500",
        };
    }
  };

  const colors = getColors();

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 overflow-y-auto overscroll-contain p-3 sm:p-4 backdrop-blur-sm transition-opacity">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby={modalDescription ? "confirmation-modal-desc" : undefined}
        className="relative w-full min-w-0 max-w-sm max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          aria-label="Close confirmation"
          onClick={handleClose}
          disabled={isLoading}
          className="absolute right-2 top-2 min-h-11 min-w-11 inline-flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus:outline-none"
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

          <h3
            id="confirmation-modal-title"
            className="mb-2 max-w-full px-6 break-words text-lg sm:text-xl font-bold text-gray-900 dark:text-white"
          >
            {title}
          </h3>
          {modalDescription && (
            <p
              id="confirmation-modal-desc"
              className="mb-6 max-w-full break-words text-sm leading-relaxed text-gray-500 dark:text-slate-400"
            >
              {modalDescription}
            </p>
          )}
          {children && <div className="w-full min-w-0 mb-6 break-words text-left">{children}</div>}

          <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="w-full min-w-0 min-h-11 break-words whitespace-normal rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-slate-600 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full min-w-0 min-h-11 break-words whitespace-normal rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed ${colors.button}`}
            >
              {isLoading ? "Processing..." : modalConfirmText}
            </button>
          </div>
          {alternateText && onAlternateAction && (
            <div className="w-full mt-3">
              <button
                type="button"
                onClick={onAlternateAction}
                disabled={isLoading}
                className="w-full min-w-0 min-h-11 break-words whitespace-normal rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 transition-colors"
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
