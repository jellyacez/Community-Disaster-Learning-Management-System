import { useState, useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Book02Icon, HelpSquareIcon } from "@hugeicons/core-free-icons";

export default function EnrollCodeModal({
  isOpen,
  moduleTitle = "",
  onClose,
  onSubmit,
  onRequestCode,
  isLoading = false,
  isRequesting = false,
  error = "",
  onInputChange,
}) {
  const [code, setCode] = useState("");
  const inputRef = useRef(null);

  // Clear the field each time the modal opens (adjusted during render, not in an effect)
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setCode("");
  }

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !isLoading && !isRequesting) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isLoading, isRequesting, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setCode(e.target.value.toUpperCase().replace(/[\s-]/g, ""));
    onInputChange?.();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code || isLoading || isRequesting) return;
    onSubmit(code);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading && !isRequesting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enroll-code-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <HugeiconsIcon icon={Book02Icon} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="enroll-code-title" className="text-lg font-extrabold text-gray-900">
              Enter Enrollment Code
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Ask your MDRRMO or request a code to join{" "}
              <span className="font-semibold text-gray-700">"{moduleTitle}"</span>.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="enroll-code-input" className="sr-only">
            Enrollment code
          </label>
          <input
            id="enroll-code-input"
            ref={inputRef}
            type="text"
            value={code}
            onChange={handleChange}
            maxLength={12}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={isLoading || isRequesting}
            placeholder="******"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "enroll-code-error" : undefined}
            className={`w-full rounded-xl border px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 disabled:bg-gray-50 ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                : "border-gray-300 focus:border-red-500 focus:ring-red-500/20"
            }`}
          />

          <p
            id="enroll-code-error"
            role="alert"
            className={`mt-2 min-h-[1.25rem] text-sm font-medium text-red-600 ${error ? "" : "invisible"}`}
          >
            {error || " "}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onRequestCode}
              disabled={isLoading || isRequesting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <HugeiconsIcon icon={HelpSquareIcon} className="h-4 w-4 text-gray-500" />
              <span>Request Code</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading || isRequesting}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!code || isLoading || isRequesting}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Checking..." : "Enroll"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}