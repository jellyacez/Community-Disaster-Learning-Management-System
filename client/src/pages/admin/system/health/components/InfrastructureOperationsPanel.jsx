import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Database01Icon,
  Download01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons";
import ConfirmationModal from "../../../../../components/ui/modals/ConfirmationModal";
import useInfrastructureOperations from "../../hooks/useInfrastructureOperations";

export default function InfrastructureOperationsPanel() {
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [showRestore, setShowRestore] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const {
    restoreBackup,
    isRestoringBackup,
    downloadBackup,
    isDownloadingBackup,
    downloadServerLogs,
    isDownloadingServerLogs,
  } = useInfrastructureOperations();

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-bold text-gray-900">
            Infrastructure Operations
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4 flex-1 w-full">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <HugeiconsIcon
                  icon={Database01Icon}
                  className="w-5 h-5 text-blue-600"
                />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">
                  Manual Database Backup
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  Verify your account password to download an encrypted database
                  backup. The recovery password is managed separately.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBackupModal(true)}
              disabled={isDownloadingBackup}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isDownloadingBackup ? (
                <svg
                  className="animate-spin w-4 h-4 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
              )}
              {isDownloadingBackup
                ? "Generating Backup..."
                : "Download Encrypted ZIP"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4 flex-1 w-full">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <HugeiconsIcon
                  icon={Alert01Icon}
                  className="w-5 h-5 text-red-600"
                />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">
                  Export Server Error Logs
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  Download the raw Node.js runtime logs (.log) to diagnose API
                  failures, uncaught exceptions, and console errors.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLogsModal(true)}
              disabled={isDownloadingServerLogs}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isDownloadingServerLogs ? (
                <svg
                  className="animate-spin w-4 h-4 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
              )}
              {isDownloadingServerLogs
                ? "Downloading..."
                : "Download .log File"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showBackupModal}
        onClose={() => {
          if (isDownloadingBackup) return;
          setShowBackupModal(false);
          setAccountPassword("");
        }}
        onConfirm={() =>
          downloadBackup(accountPassword, () => {
            setShowBackupModal(false);
            setAccountPassword("");
          })
        }
        isLoading={isDownloadingBackup}
        title="Download Database Backup?"
        description="Enter your own account password to authorize this download. The backup uses the designated recovery password configured on the server."
        confirmText="Download ZIP"
        type="warning"
      >
        <label className="block text-sm">
          Your account password
          <input
            type="password"
            autoComplete="current-password"
            disabled={isDownloadingBackup}
            value={accountPassword}
            onChange={(e) => setAccountPassword(e.target.value)}
            className="mt-2 w-full rounded border p-2"
          />
        </label>
      </ConfirmationModal>
      <button
        type="button"
        onClick={() => setShowRestore(true)}
        className="mt-4 cursor-pointer rounded-xl border p-3 text-white bg-red-600  border-transparent hover:bg-red-900 hover:border-red-900"
      >
        Restore encrypted database backup
      </button>
      {showRestore && (
        <RestoreBackupDialog
          isRestoring={isRestoringBackup}
          onRestore={restoreBackup}
          onClose={() => setShowRestore(false)}
        />
      )}

      <ConfirmationModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        onConfirm={() => downloadServerLogs(() => setShowLogsModal(false))}
        isLoading={isDownloadingServerLogs}
        title="Export Server Logs?"
        description="This will securely download the raw Node.js runtime `.log` file containing system crashes and errors."
        confirmText="Download .log"
        type="danger"
      />
    </>
  );
}

// A dedicated form gives restore enough space without changing shared confirmations.
function RestoreBackupDialog({ isRestoring, onRestore, onClose }) {
  const [backupFile, setBackupFile] = useState(null);
  const [zipPassword, setZipPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState({});
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmationInputRef = useRef(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fileInputRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus?.();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!isRestoring) onClose();
      }
      if (event.key !== "Tab") return;
      const controls = [
        ...(dialogRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
        ) || []),
      ].filter((element) => element.getClientRects().length > 0);
      if (!controls.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isRestoring, onClose]);

  const clearError = (field) => {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isRestoring) return;
    const nextErrors = {};
    if (!backupFile) {
      nextErrors.file = "Choose a backup ZIP before continuing.";
    } else if (!backupFile.name.toLowerCase().endsWith(".zip")) {
      nextErrors.file = "Choose the .zip backup downloaded from this system.";
    } else if (backupFile.size === 0) {
      nextErrors.file = "This file is empty. Choose another backup ZIP.";
    }
    if (!zipPassword)
      nextErrors.password = "Enter the password for this backup ZIP.";
    if (confirmation !== "RESTORE DATABASE") {
      nextErrors.confirmation = "Type RESTORE DATABASE exactly as shown.";
    }
    setErrors(nextErrors);
    if (nextErrors.file) return fileInputRef.current?.focus();
    if (nextErrors.password) return passwordInputRef.current?.focus();
    if (nextErrors.confirmation) return confirmationInputRef.current?.focus();

    // Reuse the existing multipart request and server-side restore checks.
    onRestore(backupFile, zipPassword, confirmation, onClose);
  };

  const inputClass =
    "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6">
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={isRestoring}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl outline-none dark:bg-slate-900 dark:text-white sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-700 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-bold sm:text-xl">
              Restore from a backup
            </h2>
            <p
              id={descriptionId}
              className="mt-1 text-sm text-slate-600 dark:text-slate-300"
            >
              Choose a saved backup to recover your database.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            aria-label="Close restore dialog"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            ×
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-semibold">
                Restoring will replace existing database records.
              </p>
              <p className="mt-1">
                Recent changes may be lost. Take a current backup and stop other
                users from making changes first.
              </p>
            </div>

            <div>
              <label
                htmlFor={`${id}-file`}
                className="block text-sm font-semibold"
              >
                1. Choose your backup ZIP
              </label>
              <p
                id={`${id}-file-help`}
                className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300"
              >
                Select the encrypted .zip file downloaded from this system.
              </p>
              <input
                ref={fileInputRef}
                id={`${id}-file`}
                type="file"
                accept=".zip,application/zip"
                disabled={isRestoring}
                aria-invalid={Boolean(errors.file)}
                aria-describedby={`${id}-file-help${errors.file ? ` ${id}-file-error` : ""}`}
                onChange={(event) => {
                  setBackupFile(event.target.files?.[0] || null);
                  clearError("file");
                }}
                className="mt-2 block w-full min-w-0 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600 file:mb-2 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:file:bg-slate-200 dark:file:text-slate-900"
              />
              {backupFile && (
                <p className="mt-2 break-all text-xs text-slate-600 dark:text-slate-300">
                  Selected: {backupFile.name} ·{" "}
                  {(backupFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              )}
              {errors.file && (
                <p
                  id={`${id}-file-error`}
                  role="alert"
                  className="mt-2 text-sm text-red-700 dark:text-red-300"
                >
                  {errors.file}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${id}-password`}
                className="block text-sm font-semibold"
              >
                2. Enter the backup ZIP password
              </label>
              <p
                id={`${id}-password-help`}
                className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300"
              >
                Use the designated backup password provided by your system
                administrator. This is separate from your account password.
              </p>
              <div className="flex items-center gap-2">
                <input
                  ref={passwordInputRef}
                  id={`${id}-password`}
                  type={showPassword ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  value={zipPassword}
                  disabled={isRestoring}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={`${id}-password-help${errors.password ? ` ${id}-password-error` : ""}`}
                  onChange={(event) => {
                    setZipPassword(event.target.value);
                    clearError("password");
                  }}
                  placeholder="Backup ZIP password"
                  className={inputClass}
                />
                <button
                  type="button"
                  disabled={isRestoring}
                  aria-controls={`${id}-password`}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                  className="mt-2 min-h-11 shrink-0 rounded-lg border border-slate-300 px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-60 dark:border-slate-600"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && (
                <p
                  id={`${id}-password-error`}
                  role="alert"
                  className="mt-2 text-sm text-red-700 dark:text-red-300"
                >
                  {errors.password}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${id}-confirmation`}
                className="block text-sm font-semibold"
              >
                3. Confirm you want to replace the data
              </label>
              <p
                id={`${id}-confirmation-help`}
                className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300"
              >
                Type{" "}
                <strong className="select-all font-mono text-slate-900 dark:text-white">
                  RESTORE DATABASE
                </strong>{" "}
                below to confirm.
              </p>
              <input
                ref={confirmationInputRef}
                id={`${id}-confirmation`}
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={confirmation}
                disabled={isRestoring}
                aria-invalid={Boolean(errors.confirmation)}
                aria-describedby={`${id}-confirmation-help${errors.confirmation ? ` ${id}-confirmation-error` : ""}`}
                onChange={(event) => {
                  setConfirmation(event.target.value);
                  clearError("confirmation");
                }}
                placeholder="RESTORE DATABASE"
                className={`${inputClass} font-mono`}
              />
              {errors.confirmation && (
                <p
                  id={`${id}-confirmation-error`}
                  role="alert"
                  className="mt-2 text-sm text-red-700 dark:text-red-300"
                >
                  {errors.confirmation}
                </p>
              )}
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              This restores database records. Uploaded videos, images and other
              media need a separate backup.
            </p>
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
            <p
              role="status"
              aria-live="polite"
              className="mb-3 text-xs text-slate-600 dark:text-slate-300"
            >
              {isRestoring
                ? "Restoring your database. Keep this page open and do not submit again."
                : "Only continue during a maintenance window, with restore enabled."}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isRestoring}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRestoring}
                className="min-h-11 cursor-pointer rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:opacity-60"
              >
                {isRestoring ? "Restoring…" : "Restore database"}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
