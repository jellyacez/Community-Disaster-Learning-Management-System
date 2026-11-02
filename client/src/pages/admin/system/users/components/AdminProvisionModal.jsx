import { useState, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { UserAdd01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";

import AdminBasicInfoFields from "./provision/AdminBasicInfoFields";
import AdminRoleSelection from "./provision/AdminRoleSelection";
import AdminPasswordStrategy from "./provision/AdminPasswordStrategy";

export default function AdminProvisionModal({ onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "mdrrmo_admin",
    barangay: "",
    password: "",
  });
  const [showAutoGenerate, setShowAutoGenerate] = useState(true);
  const [formError, setFormError] = useState("");
  const [showDiscard, setShowDiscard] = useState(false);
  const dialogRef = useRef(null);
  const keepEditingRef = useRef(null);
  const cancelRef = useRef(null);
  const bodyRef = useRef(null);
  const id = useId();

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data };
      if (showAutoGenerate) {
        delete payload.password; // backend will auto-generate
      }
      const res = await apiClient.post("/admin/users/provision", payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["systemStats"] });

      toast.success(
        <div>
          <p className="font-semibold">Account Provisioned</p>
          <p className="text-sm">
            {data.generatedPassword
              ? `Auto-generated password emailed.`
              : "Account created successfully."}
          </p>
        </div>,
        { duration: 5000 },
      );

      onClose();
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to provision account.";
      setFormError(message);
      toast.error(message);
      bodyRef.current?.scrollTo({ top: 0 });
    },
  });

  const handleSafeClose = () => {
    if (mutation.isPending) return;
    const hasDraft =
      formData.name.trim() ||
      formData.email.trim() ||
      formData.barangay ||
      formData.password ||
      formData.role !== "mdrrmo_admin" ||
      !showAutoGenerate;
    if (hasDraft) setShowDiscard(true);
    else onClose();
  };

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus?.();
    };
  }, []);

  useEffect(() => {
    if (showDiscard) keepEditingRef.current?.focus();
  }, [showDiscard]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (mutation.isPending) return;
        if (showDiscard) {
          setShowDiscard(false);
          requestAnimationFrame(() => cancelRef.current?.focus());
        } else handleSafeClose();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = [
        ...(dialogRef.current?.querySelectorAll(
          'button, input, select, textarea, a[href], [tabindex="0"]',
        ) || []),
      ].filter(
        (element) =>
          !element.matches(':disabled, [type="hidden"], [tabindex="-1"]') &&
          element.getClientRects().length > 0,
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const outside =
        document.activeElement === dialogRef.current ||
        !dialogRef.current.contains(document.activeElement);
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
    // Closing reads the current draft and pending state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, showAutoGenerate, showDiscard, mutation.isPending, onClose]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (mutation.isPending || showDiscard) return;
    setFormError("");
    if (formData.role === "barangay_admin" && !formData.barangay) {
      setFormError("Choose a barangay for this barangay administrator.");
      bodyRef.current?.scrollTo({ top: 0 });
      return;
    }
    mutation.mutate(formData);
  };

  if (typeof document === "undefined") return null;

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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <HugeiconsIcon icon={UserAdd01Icon} size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id={`${id}-title`}
              className="break-words text-lg font-bold sm:text-xl"
            >
              Add administrator
            </h2>
            <p
              id={`${id}-description`}
              className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400"
            >
              Enter account details, choose access, and set up a password.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSafeClose}
            disabled={mutation.isPending}
            aria-label="Close administrator form"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} aria-hidden="true" />
          </button>
        </header>

        {showDiscard ? (
          <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
            <h3 className="font-bold">Discard account details?</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              The account has not been created. Closing will clear the details
              you entered.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                ref={keepEditingRef}
                type="button"
                onClick={() => {
                  setShowDiscard(false);
                  requestAnimationFrame(() => cancelRef.current?.focus());
                }}
                className="min-h-11 cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-600"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 cursor-pointer rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                Discard details
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div
              ref={bodyRef}
              className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6"
            >
              {formError && (
                <p
                  role="alert"
                  className="break-words rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-relaxed text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
                >
                  {formError}
                </p>
              )}

              <fieldset
                disabled={mutation.isPending}
                className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <legend className="px-2 text-sm font-bold">
                  1. Account details
                </legend>
                <div className="min-w-0 space-y-4 [&_input:not([type=checkbox]):not([type=radio])]:min-h-11 [&_input]:max-w-full [&_input]:min-w-0 [&_input]:text-base sm:[&_input]:text-sm">
                  <AdminBasicInfoFields
                    formData={formData}
                    setFormData={setFormData}
                  />
                </div>
              </fieldset>

              <fieldset
                disabled={mutation.isPending}
                className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <legend className="px-2 text-sm font-bold">
                  2. Role and assignment
                </legend>
                <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Choose the role available to you. Barangay administrators need
                  an assigned barangay.
                </p>
                <div className="min-w-0 [&_select]:min-h-11 [&_select]:max-w-full [&_select]:text-base sm:[&_select]:text-sm">
                  <AdminRoleSelection
                    formData={formData}
                    setFormData={setFormData}
                  />
                </div>
              </fieldset>

              <fieldset
                disabled={mutation.isPending}
                className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <legend className="px-2 text-sm font-bold">
                  3. Password setup
                </legend>
                <div className="min-w-0 [&_input:not([type=checkbox]):not([type=radio])]:min-h-11 [&_input]:max-w-full [&_input]:min-w-0 [&_input]:text-base sm:[&_input]:text-sm">
                  <AdminPasswordStrategy
                    formData={formData}
                    setFormData={setFormData}
                    showAutoGenerate={showAutoGenerate}
                    setShowAutoGenerate={setShowAutoGenerate}
                  />
                </div>
              </fieldset>
            </div>

            <footer className="shrink-0 border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
              <p
                role="status"
                aria-live="polite"
                className="mb-3 text-xs text-slate-500 dark:text-slate-400"
              >
                {mutation.isPending
                  ? "Creating account… Keep this dialog open."
                  : "Review the email, role and password setup before creating the account."}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={handleSafeClose}
                  disabled={mutation.isPending}
                  className="min-h-11 cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                >
                  {mutation.isPending && (
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                    />
                  )}
                  {mutation.isPending
                    ? "Creating account…"
                    : "Create admin account"}
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
