import { createElement } from "react";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";

// Assessment steps a learner must retake to renew a module certificate, as reported by
// the server (`recertificationStepIds`). Persisted so the viewer can reopen those quizzes
// after a reload or while offline, and so a reply that arrives during an offline-queue
// sync still reaches the viewer.
const storageKey = (moduleId) => `lms_recert_retake_${moduleId}`;

export const RECERT_RETAKES_UPDATED = "recertification-retakes-updated";

export const getPendingRetakes = (moduleId) => {
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey(moduleId)) || "[]");
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
};

export const setPendingRetakes = (moduleId, stepIds) => {
  try {
    if (stepIds?.length) {
      localStorage.setItem(storageKey(moduleId), JSON.stringify(stepIds));
    } else {
      localStorage.removeItem(storageKey(moduleId));
    }
  } catch {
    // Storage blocked: the in-memory viewer state still works for this session
  }
  window.dispatchEvent(
    new CustomEvent(RECERT_RETAKES_UPDATED, { detail: { moduleId: String(moduleId), stepIds: stepIds || [] } })
  );
};

export const showRecertificationToast = (
  message = "Your certificate is due for renewal. Retake the final assessment to recertify."
) =>
  toast(message, {
    icon: createElement(HugeiconsIcon, {
      icon: RefreshIcon,
      className: "w-5 h-5 shrink-0 text-amber-600",
      "aria-hidden": true,
    }),
    duration: 7000,
    id: "recertification-required",
  });
