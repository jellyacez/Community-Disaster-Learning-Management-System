import { memo, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, Cancel01Icon, CheckmarkBadge01Icon, Book02Icon } from "@hugeicons/core-free-icons";

const ConfirmationModal = memo(function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  alternateText,
  onAlternateAction,
  type = "warning", // "warning" | "success" | "danger" | "primary"
  icon,
  children,
  isLoading = false
}) {
  // Keyboard shortcut: Escape to cancel
  useEffect(() => {
    if (!isOpen || isLoading) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    if (icon) return icon;
    switch (type) {
      case "success": return CheckmarkBadge01Icon;
      case "danger": return Alert01Icon;
      case "primary": return Book02Icon;
      default: return Alert01Icon;
    }
  };

  const getColors = () => {
    switch (type) {
      case "success": return { bg: "bg-green-100 dark:bg-emerald-950/60", text: "text-green-600 dark:text-emerald-400", button: "bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 focus:ring-green-500" };
      case "danger": return { bg: "bg-red-100 dark:bg-red-950/60", text: "text-red-600 dark:text-red-400", button: "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 focus:ring-red-500" };
      case "primary": return { bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-600 dark:text-red-400", button: "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 focus:ring-red-500" };
      default: return { bg: "bg-yellow-100 dark:bg-amber-950/60", text: "text-yellow-600 dark:text-amber-400", button: "bg-yellow-600 hover:bg-yellow-700 dark:bg-amber-600 dark:hover:bg-amber-700 focus:ring-yellow-500" };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity">
      <div 
        role="alertdialog" 
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-desc"
        className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus:outline-none"
        >
          <HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${colors.bg}`}>
            <HugeiconsIcon aria-hidden="true" icon={getIcon()} className={`w-6 h-6 ${colors.text}`} />
          </div>
          
          <h3 id="confirmation-modal-title" className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          {description && (
            <p id="confirmation-modal-desc" className="mb-6 text-sm leading-relaxed text-gray-500 dark:text-slate-400">{description}</p>
          )}
          {children && (
            <div className="w-full mb-6 text-left">{children}</div>
          )}
          
          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-slate-600 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed ${colors.button}`}
            >
              {isLoading ? "Processing..." : confirmText}
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
});

export default ConfirmationModal;
