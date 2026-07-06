import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, Cancel01Icon, CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";

const ConfirmationModal = memo(function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "warning", // "warning" | "success" | "danger"
  isLoading = false
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success": return CheckmarkBadge01Icon;
      case "danger": return Alert01Icon;
      default: return Alert01Icon;
    }
  };

  const getColors = () => {
    switch (type) {
      case "success": return { bg: "bg-green-100", text: "text-green-600", button: "bg-green-600 hover:bg-green-700 focus:ring-green-500" };
      case "danger": return { bg: "bg-red-100", text: "text-red-600", button: "bg-red-600 hover:bg-red-700 focus:ring-red-500" };
      default: return { bg: "bg-yellow-100", text: "text-yellow-600", button: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500" };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity">
      <div 
        role="alertdialog" 
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-desc"
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
        >
          <HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${colors.bg}`}>
            <HugeiconsIcon aria-hidden="true" icon={getIcon()} className={`w-6 h-6 ${colors.text}`} />
          </div>
          
          <h3 id="confirmation-modal-title" className="mb-2 text-xl font-bold text-gray-900">{title}</h3>
          <p id="confirmation-modal-desc" className="mb-6 text-sm leading-relaxed text-gray-500">{description}</p>
          
          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors ${colors.button}`}
            >
              {isLoading ? "Processing..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ConfirmationModal;
