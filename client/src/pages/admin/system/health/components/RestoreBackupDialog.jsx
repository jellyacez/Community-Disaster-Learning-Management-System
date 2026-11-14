import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  CloudUploadIcon,
  Delete02Icon,
  Download01Icon,
  FileZipIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import apiClient from "../../../../../lib/apiClient";
import StatusBadge from "../../../../../components/ui/StatusBadge";
import PasswordInput from "../../../../../components/ui/inputs/PasswordInput";

const CONFIRM_PHRASE = "RESTORE DATABASE";
// Matches the server's multer limit and the 12-256 byte backup password rule.
const MAX_UPLOAD_BYTES = 65 * 1024 * 1024;
const textEncoder = new TextEncoder();

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileProblem(file) {
  if (!file) return "Choose the backup .zip file.";
  if (!file.name.toLowerCase().endsWith(".zip"))
    return "That isn't a .zip file. Choose the backup downloaded from this system.";
  if (file.size === 0) return "That file is empty. Choose another backup.";
  if (file.size > MAX_UPLOAD_BYTES) return "That file is over 65 MB, the upload limit.";
  return null;
}

function getBlockers({ status, statusFailed, file, backupPassword, accountPassword, confirmation }) {
  const blockers = [];
  if (statusFailed) blockers.push("Couldn't check restore status. Retry on the left.");
  else if (!status) blockers.push("Checking restore status…");
  else {
    if (!status.restoreEnabled)
      blockers.push("Restore is turned off on the server. Set ENABLE_DATABASE_RESTORE=true and restart.");
    if (!status.maintenanceMode) blockers.push("Turn on maintenance mode in System Settings first.");
  }
  const fileProblem = getFileProblem(file);
  if (fileProblem) blockers.push(fileProblem);
  const passwordBytes = textEncoder.encode(backupPassword).length;
  if (passwordBytes < 12 || passwordBytes > 256)
    blockers.push("Enter the backup password (12 characters or more).");
  if (!accountPassword) blockers.push("Enter your account password.");
  if (confirmation !== CONFIRM_PHRASE) blockers.push(`Type ${CONFIRM_PHRASE} to confirm.`);
  return blockers;
}

function StatusRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="text-right text-sm font-semibold text-gray-900">{children}</dd>
    </div>
  );
}

function StepLabel({ number, htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-semibold text-gray-900">
      <span
        aria-hidden="true"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-bold text-white dark:bg-gray-100 dark:text-gray-900"
      >
        {number}
      </span>
      {children}
    </label>
  );
}

export default function RestoreBackupDialog({
  isRestoring,
  onRestore,
  onClose,
  onDownloadBackup,
  isDownloadingBackup,
  // True while another dialog (the backup download) is open on top of this one.
  suspended,
}) {
  const [backupFile, setBackupFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [serverError, setServerError] = useState("");
  const [completedMessage, setCompletedMessage] = useState("");
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);
  const id = useId();

  const statusQuery = useQuery({
    queryKey: ["restoreStatus"],
    queryFn: async () => (await apiClient.get("/admin/infrastructure/restore-status")).data.data,
    retry: false,
    // Picks up maintenance mode being turned on in another tab.
    refetchInterval: isRestoring ? false : 15000,
  });
  const status = statusQuery.data;

  const blockers = getBlockers({
    status,
    statusFailed: statusQuery.isError,
    file: backupFile,
    backupPassword,
    accountPassword,
    confirmation,
  });
  const fileProblem = backupFile ? getFileProblem(backupFile) : null;
  const canRestore = blockers.length === 0 && !isRestoring;

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
    if (suspended) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!isRestoring) onClose();
        return;
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
      const inside = dialogRef.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isRestoring, onClose, suspended]);

  const chooseFile = (file) => {
    setBackupFile(file || null);
    setServerError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canRestore) return;
    setServerError("");
    const result = await onRestore({
      file: backupFile,
      password: backupPassword,
      accountPassword,
      confirmation,
    });
    if (result.ok) {
      setCompletedMessage(result.message);
    } else {
      setServerError(result.error);
    }
  };

  const titleId = `${id}-title`;
  const reasonId = `${id}-reason`;
  const fileId = `${id}-file`;
  const lastBackup = status?.lastBackupAt
    ? new Date(status.lastBackupAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6">
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={isRestoring}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-bold">
              Restore database from a backup
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Replaces everything in the database with the contents of a backup ZIP.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            aria-label="Close restore dialog"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-40"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {completedMessage ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-6 py-12 text-center">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="h-12 w-12 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <p role="status" className="max-w-md text-base font-semibold text-gray-900">
                {completedMessage}
              </p>
              <p className="max-w-md text-sm text-gray-500">
                After signing in, check the restored data, then turn off maintenance mode.
              </p>
            </div>
            <footer className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => window.location.assign("/signin")}
                className="min-h-11 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                Sign in again
              </button>
            </footer>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <aside
                aria-labelledby={`${id}-before`}
                className="space-y-5 border-b border-gray-100 bg-gray-50 px-5 py-5 sm:px-6 md:border-b-0 md:border-r"
              >
                <h3 id={`${id}-before`} className="text-sm font-bold text-gray-900">
                  Before you restore
                </h3>

                {statusQuery.isError ? (
                  <div className="space-y-2">
                    <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                      Couldn&apos;t load restore status.
                    </p>
                    <button
                      type="button"
                      onClick={() => statusQuery.refetch()}
                      className="min-h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <dl className="divide-y divide-gray-200 dark:divide-slate-700" aria-busy={statusQuery.isPending}>
                    <StatusRow label="Maintenance mode">
                      {status ? (
                        <StatusBadge color={status.maintenanceMode ? "emerald" : "red"}>
                          {status.maintenanceMode ? "On" : "Off"}
                        </StatusBadge>
                      ) : (
                        <span className="text-gray-500">Checking…</span>
                      )}
                    </StatusRow>
                    <StatusRow label="Restore enabled">
                      {status ? (
                        <StatusBadge color={status.restoreEnabled ? "emerald" : "red"}>
                          {status.restoreEnabled ? "Yes" : "No"}
                        </StatusBadge>
                      ) : (
                        <span className="text-gray-500">Checking…</span>
                      )}
                    </StatusRow>
                    <StatusRow label="Last backup downloaded">
                      {status ? (lastBackup ?? <span className="font-normal text-gray-500">None recorded</span>) : (
                        <span className="text-gray-500">Checking…</span>
                      )}
                    </StatusRow>
                  </dl>
                )}

                <button
                  type="button"
                  onClick={onDownloadBackup}
                  disabled={isRestoring || isDownloadingBackup}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <HugeiconsIcon
                    icon={isDownloadingBackup ? Loading03Icon : Download01Icon}
                    className={`h-4 w-4 ${isDownloadingBackup ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                  {isDownloadingBackup ? "Preparing backup…" : "Download a fresh backup first"}
                </button>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                  <p className="flex gap-2 font-semibold">
                    <HugeiconsIcon icon={Alert02Icon} className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    Everything goes back to the backup&apos;s point in time.
                  </p>
                  <p className="mt-1">
                    That includes passwords and bans. Everyone is signed out. Uploaded media isn&apos;t
                    in the backup and stays as it is.
                  </p>
                </div>
              </aside>

              <div className="space-y-6 px-5 py-5 sm:px-6">
                <div className="space-y-2">
                  <StepLabel number={1} htmlFor={fileId}>
                    Backup file
                  </StepLabel>
                  <label
                    htmlFor={fileId}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!isRestoring) setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsDragging(false);
                      if (!isRestoring) chooseFile(event.dataTransfer.files?.[0]);
                    }}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-red-600 has-[:focus-visible]:ring-offset-2 ${
                      isDragging
                        ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                        : fileProblem
                          ? "border-red-300 bg-white dark:border-red-800"
                          : "border-gray-200 bg-white hover:border-gray-300"
                    } ${isRestoring ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <input
                      ref={fileInputRef}
                      id={fileId}
                      type="file"
                      accept=".zip,application/zip"
                      disabled={isRestoring}
                      aria-invalid={Boolean(fileProblem)}
                      aria-describedby={`${fileId}-hint`}
                      onChange={(event) => {
                        chooseFile(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                      className="sr-only"
                    />
                    <HugeiconsIcon
                      icon={backupFile ? FileZipIcon : CloudUploadIcon}
                      className="h-8 w-8 shrink-0 text-gray-500"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      {backupFile ? (
                        <>
                          <span className="block break-all text-sm font-semibold text-gray-900">
                            {backupFile.name}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {formatBytes(backupFile.size)} · <span className="underline">Choose a different file</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="block text-sm text-gray-900">
                            Drop the backup .zip here or{" "}
                            <span className="font-semibold text-red-700 underline dark:text-red-400">choose a file</span>
                          </span>
                          <span className="block text-xs text-gray-500">Encrypted ZIP from this system, up to 65 MB</span>
                        </>
                      )}
                    </span>
                  </label>
                  <div className="flex items-start justify-between gap-3">
                    <p
                      id={`${fileId}-hint`}
                      className={`text-xs ${fileProblem ? "text-red-700 dark:text-red-300" : "text-gray-500"}`}
                    >
                      {fileProblem || (backupFile ? "Ready to upload." : "")}
                    </p>
                    {backupFile ? (
                      <button
                        type="button"
                        onClick={() => chooseFile(null)}
                        disabled={isRestoring}
                        className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-gray-600 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-50"
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" aria-hidden="true" />
                        Remove file
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <StepLabel number={2} htmlFor={`${id}-backup-password`}>
                    Backup password
                  </StepLabel>
                  <p className="text-xs text-gray-500">
                    The password that locks the backup ZIP. Your system administrator keeps it. It is
                    not your account password.
                  </p>
                  <PasswordInput
                    id={`${id}-backup-password`}
                    name="backupPassword"
                    value={backupPassword}
                    onChange={(event) => {
                      setBackupPassword(event.target.value);
                      setServerError("");
                    }}
                    placeholder="Backup password"
                    autoComplete="off"
                    disabled={isRestoring}
                  />
                </div>

                <div className="space-y-2">
                  <StepLabel number={3} htmlFor={`${id}-account-password`}>
                    Your account password
                  </StepLabel>
                  <p className="text-xs text-gray-500">Confirms it&apos;s you.</p>
                  <PasswordInput
                    id={`${id}-account-password`}
                    name="accountPassword"
                    value={accountPassword}
                    onChange={(event) => {
                      setAccountPassword(event.target.value);
                      setServerError("");
                    }}
                    placeholder="Account password"
                    autoComplete="current-password"
                    disabled={isRestoring}
                  />
                </div>

                <div className="space-y-2">
                  <StepLabel number={4} htmlFor={`${id}-confirmation`}>
                    Type <span className="font-mono">{CONFIRM_PHRASE}</span> to confirm
                  </StepLabel>
                  <input
                    id={`${id}-confirmation`}
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={confirmation}
                    disabled={isRestoring}
                    onChange={(event) => {
                      setConfirmation(event.target.value);
                      setServerError("");
                    }}
                    placeholder={CONFIRM_PHRASE}
                    className="w-full rounded-xl border border-gray-500 px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-gray-500 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/50 disabled:opacity-60"
                  />
                </div>

                {serverError ? (
                  <div
                    role="alert"
                    className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                  >
                    <HugeiconsIcon icon={Alert02Icon} className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {serverError}
                  </div>
                ) : null}
              </div>
            </div>

            <footer className="flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p id={reasonId} role="status" aria-live="polite" className="text-xs text-gray-600 sm:max-w-sm">
                {isRestoring
                  ? "Restoring. This can take a few minutes. Keep this page open."
                  : canRestore
                    ? "Ready. This can't be undone from here."
                    : blockers[0]}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isRestoring}
                  className="min-h-11 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canRestore}
                  aria-describedby={reasonId}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRestoring ? (
                    <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {isRestoring ? "Restoring…" : "Restore database"}
                </button>
              </div>
            </footer>
          </form>
        )}
      </section>
    </div>,
    document.body,
  );
}
