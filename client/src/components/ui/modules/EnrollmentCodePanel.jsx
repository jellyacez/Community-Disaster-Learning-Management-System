import { useState } from "react";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

/** Copy and Regenerate for a module's enrollment code. The server only returns it to the roles that create modules. */
export default function EnrollmentCodePanel({ moduleId, moduleTitle = "" }) {
  const queryClient = useQueryClient();
  const queryKey = ["enrollmentCode", moduleId];
  const [confirming, setConfirming] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const { data: code, isLoading, isError } = useQuery({
    queryKey,
    enabled: Boolean(moduleId),
    // A code can change at any time, so never show a stale one
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const res = await apiClient.get(`/modules/${moduleId}/enrollment-code`);
      return res.data?.data?.enrollment_code || "";
    },
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Enrollment code copied.");
    } catch {
      toast.error("Couldn't copy automatically. Please select and copy the code.");
    }
  };

  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true);
      const res = await apiClient.post(`/modules/${moduleId}/enrollment-code/regenerate`);
      queryClient.setQueryData(queryKey, res.data?.data?.enrollment_code || "");
      toast.success("New enrollment code generated.");
      setConfirming(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to regenerate the code.");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="pr-8 text-base font-extrabold text-gray-900">Enrollment Code</h3>
      {moduleTitle && (
        <p className="mt-0.5 truncate text-sm font-semibold text-gray-700" title={moduleTitle}>
          {moduleTitle}
        </p>
      )}
      <p className="mt-2 text-sm text-gray-500">
        Share this code with the learners you want in this module. They enter it when they enroll.
        Regenerating it does not remove anyone who is already enrolled.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div
          className="min-w-[10rem] rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em] text-gray-900"
          aria-live="polite"
        >
          {isLoading ? "······" : isError ? "Unavailable" : code || "Not set"}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!code}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Copy
        </button>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={isLoading || isError}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            Regenerate
          </button>
        )}
      </div>

      {confirming && (
        <div role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">
            The current code will stop working for new enrollments. Learners who are already enrolled keep their access.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isRegenerating ? "Generating..." : "Yes, regenerate"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isRegenerating}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
