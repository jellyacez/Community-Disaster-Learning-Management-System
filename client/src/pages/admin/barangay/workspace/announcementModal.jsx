import { useState, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Notification01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";
import { invalidateAnnouncementQueries } from "../../../../hooks/useLiftAnnouncement";

// Must match URGENT_DURATION_HOURS on the server (utils/validators.js).
const URGENT_DURATIONS = [6, 12, 24, 48, 72];
const DEFAULT_URGENT_HOURS = 24;
const barangayLabel = (name) =>
  /^barangay\b/i.test(name || "") ? name : `Barangay ${name}`;

export default function AnnouncementModal({
  isOpen,
  onClose,
  barangayName = "Your Jurisdiction",
  currentUserRole = "barangay_admin",
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("standard");
  const [durationHours, setDurationHours] = useState(DEFAULT_URGENT_HOURS);
  const [targetBarangayId, setTargetBarangayId] = useState("");
  const [errors, setErrors] = useState({});
  const [publishError, setPublishError] = useState("");
  const [showDiscard, setShowDiscard] = useState(false);
  const dialogRef = useRef(null);
  const titleRef = useRef(null);
  const contentRef = useRef(null);
  const keepEditingRef = useRef(null);
  const cancelRef = useRef(null);
  const id = useId();

  const isHighTierAdmin = [
    "system_admin",
    "head_mdrrmo_admin",
    "mdrrmo_admin",
  ].includes(currentUserRole);

  const {
    data: barangays = [],
    isPending: isAudienceLoading,
    isError: isAudienceError,
    refetch: retryAudience,
  } = useQuery({
    queryKey: ["allBarangaysList"],
    queryFn: async () => {
      const res = await apiClient.get("/public/barangays");
      return res.data?.data || res.data || [];
    },
    enabled: isOpen && isHighTierAdmin,
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setPriority("standard");
    setDurationHours(DEFAULT_URGENT_HOURS);
    setTargetBarangayId("");
    setErrors({});
    setPublishError("");
    setShowDiscard(false);
  };

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const endpoint = isHighTierAdmin
        ? "/admin/mdrrmo/announcements"
        : "/admin/barangay/announcements";
      const res = await apiClient.post(endpoint, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Announcement broadcasted successfully!");
      invalidateAnnouncementQueries(queryClient);
      resetForm();
      onClose();
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to publish announcement.";
      setPublishError(message);
      toast.error(message);
    },
  });

  const handleSafeClose = () => {
    if (mutation.isPending) return;
    const hasDraft =
      title.trim() ||
      content.trim() ||
      priority !== "standard" ||
      targetBarangayId;
    if (hasDraft) {
      setShowDiscard(true);
      return;
    }
    resetForm();
    onClose();
  };

  // Lock background scrolling and return focus to the button that opened us.
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    if (showDiscard) keepEditingRef.current?.focus();
  }, [showDiscard]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (mutation.isPending) return;
        if (showDiscard) setShowDiscard(false);
        else handleSafeClose();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = [
        ...(dialogRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]):not([type="radio"]), input[type="radio"]:checked:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ) || []),
      ].filter(
        (element) =>
          !element.matches(":disabled") && element.getClientRects().length > 0,
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const outside =
        !dialogRef.current.contains(document.activeElement) ||
        document.activeElement === dialogRef.current;
      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || outside)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
    // handleSafeClose reads the current draft, rather than a stale initial value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    title,
    content,
    priority,
    targetBarangayId,
    showDiscard,
    mutation.isPending,
  ]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (mutation.isPending || showDiscard) return;
    const nextErrors = {};
    if (!title.trim()) nextErrors.title = "Enter an announcement title.";
    if (!content.trim())
      nextErrors.content = "Write the message residents should receive.";
    setErrors(nextErrors);
    if (nextErrors.title) return titleRef.current?.focus();
    if (nextErrors.content) return contentRef.current?.focus();
    if (isHighTierAdmin && (isAudienceLoading || isAudienceError)) {
      setPublishError(
        "Wait for the audience list to load, or use Try again before publishing.",
      );
      return;
    }
    setPublishError("");

    mutation.mutate({
      title,
      content,
      priority,
      duration_hours: priority === "urgent" ? durationHours : null,
      target_barangay_id:
        isHighTierAdmin && targetBarangayId ? targetBarangayId : null,
    });
  };

  if (!isOpen || typeof document === "undefined") return null;

  const selectedBarangay = barangays.find(
    (b) => String(b.id) === String(targetBarangayId),
  );
  const audience = isHighTierAdmin
    ? targetBarangayId
      ? barangayLabel(selectedBarangay?.name || "selected barangay")
      : "All barangays in Bacolor"
    : barangayLabel(barangayName);
  const fieldClass =
    "mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:text-sm";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        aria-busy={mutation.isPending}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:px-6 sm:py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300">
            <HugeiconsIcon
              icon={Notification01Icon}
              size={22}
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id={`${id}-title`}
              className="break-words text-lg font-bold sm:text-xl"
            >
              Create announcement
            </h2>
            <p
              id={`${id}-description`}
              className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400"
            >
              Share an advisory, update or safety notice with residents.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSafeClose}
            disabled={mutation.isPending}
            aria-label="Close announcement form"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} aria-hidden="true" />
          </button>
        </header>

        {showDiscard ? (
          <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
            <h3 className="text-base font-bold">Discard this announcement?</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Your changes have not been published. Discarding will clear this
              draft.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                ref={keepEditingRef}
                type="button"
                onClick={() => {
                  setShowDiscard(false);
                  requestAnimationFrame(() => cancelRef.current?.focus());
                }}
                className="min-h-11 cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:border-slate-600"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="min-h-11 cursor-pointer rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                Discard draft
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <div>
                {isHighTierAdmin ? (
                  <label
                    htmlFor={`${id}-audience`}
                    className="text-sm font-semibold"
                  >
                    Audience
                  </label>
                ) : (
                  <p className="text-sm font-semibold">Audience</p>
                )}
                {isHighTierAdmin ? (
                  <>
                    <select
                      id={`${id}-audience`}
                      value={targetBarangayId}
                      onChange={(event) =>
                        setTargetBarangayId(event.target.value)
                      }
                      disabled={
                        mutation.isPending ||
                        isAudienceLoading ||
                        isAudienceError
                      }
                      className={`${fieldClass} cursor-pointer`}
                      aria-describedby={`${id}-audience-help`}
                    >
                      <option value="">All barangays in Bacolor</option>
                      {barangays.map((barangay) => (
                        <option key={barangay.id} value={barangay.id}>
                          {barangayLabel(barangay.name)}
                        </option>
                      ))}
                    </select>
                    <p
                      id={`${id}-audience-help`}
                      className="mt-2 text-xs text-slate-500 dark:text-slate-400"
                    >
                      {isAudienceLoading
                        ? "Loading barangays…"
                        : "Choose all barangays or one specific barangay."}
                    </p>
                    {isAudienceError && (
                      <div
                        role="alert"
                        className="mt-2 text-sm text-red-700 dark:text-red-300"
                      >
                        Could not load barangays.{" "}
                        <button
                          type="button"
                          disabled={mutation.isPending}
                          onClick={() => retryAudience()}
                          className="min-h-11 cursor-pointer px-1 font-semibold underline disabled:cursor-not-allowed"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p
                    id={`${id}-audience`}
                    className="mt-2 break-words rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    {audience}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor={`${id}-announcement-title`}
                  className="text-sm font-semibold"
                >
                  Announcement title{" "}
                  <span className="font-normal text-slate-500">(required)</span>
                </label>
                <input
                  ref={titleRef}
                  id={`${id}-announcement-title`}
                  type="text"
                  value={title}
                  disabled={mutation.isPending}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setErrors((previous) => ({
                      ...previous,
                      title: undefined,
                    }));
                  }}
                  placeholder="e.g. Flood evacuation drill on Friday"
                  className={fieldClass}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={
                    errors.title ? `${id}-title-error` : undefined
                  }
                  required
                />
                {errors.title && (
                  <p
                    id={`${id}-title-error`}
                    role="alert"
                    className="mt-2 text-xs text-red-700 dark:text-red-300"
                  >
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor={`${id}-content`}
                  className="text-sm font-semibold"
                >
                  Message{" "}
                  <span className="font-normal text-slate-500">(required)</span>
                </label>
                <textarea
                  ref={contentRef}
                  id={`${id}-content`}
                  rows={6}
                  value={content}
                  disabled={mutation.isPending}
                  onChange={(event) => {
                    setContent(event.target.value);
                    setErrors((previous) => ({
                      ...previous,
                      content: undefined,
                    }));
                  }}
                  placeholder="Explain what is happening, who is affected, and what residents should do. Include the time and location when relevant."
                  className={`${fieldClass} min-h-36 resize-y leading-relaxed`}
                  aria-invalid={Boolean(errors.content)}
                  aria-describedby={
                    errors.content
                      ? `${id}-content-error`
                      : `${id}-content-help`
                  }
                  required
                />
                {errors.content ? (
                  <p
                    id={`${id}-content-error`}
                    role="alert"
                    className="mt-2 text-xs text-red-700 dark:text-red-300"
                  >
                    {errors.content}
                  </p>
                ) : (
                  <p
                    id={`${id}-content-help`}
                    className="mt-2 text-xs text-slate-500 dark:text-slate-400"
                  >
                    Keep instructions clear and include essential safety
                    details.
                  </p>
                )}
              </div>

              <fieldset disabled={mutation.isPending}>
                <legend className="mb-2 text-sm font-semibold">Priority</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    {
                      value: "standard",
                      label: "Standard",
                      description: "General updates, schedules and reminders.",
                    },
                    {
                      value: "urgent",
                      label: "Urgent",
                      description:
                        "Time-sensitive safety information needing immediate attention.",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="relative block min-w-0"
                    >
                      <input
                        type="radio"
                        name={`${id}-priority`}
                        value={option.value}
                        checked={priority === option.value}
                        onChange={() => setPriority(option.value)}
                        className="peer sr-only"
                      />
                      <span className="block h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-3 peer-checked:border-red-600 peer-checked:bg-red-50 peer-focus-visible:ring-2 peer-focus-visible:ring-red-600 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/40 dark:peer-checked:bg-red-950/30">
                        <span className="block text-sm font-semibold">
                          {option.label}
                          {priority === option.value && (
                            <span className="ml-2 text-xs text-red-700 dark:text-red-300">
                              Selected
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {priority === "urgent" && (
                <fieldset disabled={mutation.isPending}>
                  <legend className="text-sm font-semibold">
                    Keep urgent for
                  </legend>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Pinned for {durationHours} hours after publishing. You can
                    lift it sooner.
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {URGENT_DURATIONS.map((hours) => (
                      <label key={hours} className="block">
                        <input
                          type="radio"
                          name={`${id}-duration`}
                          value={hours}
                          checked={durationHours === hours}
                          onChange={() => setDurationHours(hours)}
                          className="peer sr-only"
                        />
                        <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 px-2 text-sm font-semibold tabular-nums peer-checked:border-red-600 peer-checked:bg-red-50 peer-checked:text-red-700 peer-focus-visible:ring-2 peer-focus-visible:ring-red-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 dark:border-slate-700 dark:peer-checked:bg-red-950/30 dark:peer-checked:text-red-300">
                          {hours} hours
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                <HugeiconsIcon
                  icon={Alert01Icon}
                  size={18}
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <p className="min-w-0 break-words">
                  This announcement will be visible to{" "}
                  <strong>{audience}</strong> when published.
                </p>
              </div>
              {publishError && (
                <p
                  role="alert"
                  className="break-words rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
                >
                  {publishError}
                </p>
              )}
            </div>

            <footer className="shrink-0 border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p
                  role="status"
                  aria-live="polite"
                  className="text-xs text-slate-500 dark:text-slate-400"
                >
                  {mutation.isPending
                    ? "Publishing… Keep this dialog open."
                    : "Review the audience and message before publishing."}
                </p>
                <div className="flex flex-col-reverse gap-2 sm:shrink-0 sm:flex-row">
                  <button
                    ref={cancelRef}
                    type="button"
                    onClick={handleSafeClose}
                    disabled={mutation.isPending}
                    className="min-h-11 cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      mutation.isPending ||
                      (isHighTierAdmin &&
                        (isAudienceLoading || isAudienceError))
                    }
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                  >
                    {mutation.isPending && (
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                      />
                    )}
                    {mutation.isPending
                      ? "Publishing…"
                      : "Publish announcement"}
                  </button>
                </div>
              </div>
            </footer>
          </form>
        )}
      </section>
    </div>,
    document.body,
  );
}
