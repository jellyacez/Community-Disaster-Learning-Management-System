import { useState, useCallback, useRef } from "react";
import apiClient from "../lib/apiClient";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

// Problems with the code itself are shown inline by the code modal instead of as a toast
const CODE_ERRORS = ["INVALID_ENROLLMENT_CODE", "ENROLLMENT_CODE_REQUIRED", "TOO_MANY_ATTEMPTS"];

export function useModuleEnrollment({
  moduleId,
  moduleTitle,
  initialEnrolled = false,
  onEnrollSuccess,
}) {
  const [localEnrolled, setLocalEnrolled] = useState(initialEnrolled);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const isEnrollingRef = useRef(false);
  const queryClient = useQueryClient();

  // Resolves to { success, message? } so the caller can show a wrong-code error inline
  const handleEnroll = useCallback(async (code) => {
    if (isEnrollingRef.current) return { success: false };
    isEnrollingRef.current = true;
    setIsEnrolling(true);

    // Guard against being used directly as an onClick handler (code would be an event object)
    const submittedCode = typeof code === "string" ? code : undefined;

    try {
      const response = await apiClient.post(`/modules/${moduleId}/enroll`, { code: submittedCode });

      if (response.data.success) {
        setLocalEnrolled(true);
        toast.success(
          `Enrollment Success! You are now enrolled in ${moduleTitle}.`,
        );

        queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
        queryClient.invalidateQueries({ queryKey: ["moduleCatalog"] });
        queryClient.invalidateQueries({ queryKey: ["enrolledModules"] });

        try {
          const dashRes = await apiClient.get("/user/dashboard");
          localStorage.setItem(
            "lms_offline_dashboard",
            JSON.stringify(dashRes.data),
          );
        } catch (e) {
          console.warn(
            "Could not background-cache dashboard for offline use.",
            e,
          );
        }

        if (onEnrollSuccess) onEnrollSuccess(moduleId);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error("Enrollment error:", error);
      const data = error.response?.data;
      // Only suppress the toast when a code was actually sent (the code modal shows the message)
      if (submittedCode && CODE_ERRORS.includes(data?.code)) {
        return { success: false, message: data.message };
      }
      toast.error(data?.message || "Failed to enroll in module. Please try again.");
      return { success: false, message: data?.message };
    } finally {
      isEnrollingRef.current = false;
      setIsEnrolling(false);
    }
  }, [moduleId, moduleTitle, onEnrollSuccess, queryClient]);

  return { localEnrolled, isEnrolling, handleEnroll };
}
