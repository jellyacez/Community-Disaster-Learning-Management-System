import { useEffect } from "react";
import EnrollmentCodePanel from "./EnrollmentCodePanel.jsx";

/**
 * Modal wrapper around EnrollmentCodePanel. Pass the module row ({ id, title }) to open it, null to close.
 */
export default function EnrollmentCodeDialog({ module, onClose }) {
  useEffect(() => {
    if (!module) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [module, onClose]);

  if (!module) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Enrollment code for ${module.title}`}
        className="relative w-full max-w-md"
      >
        <EnrollmentCodePanel moduleId={module.id} moduleTitle={module.title} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-xl leading-none text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
