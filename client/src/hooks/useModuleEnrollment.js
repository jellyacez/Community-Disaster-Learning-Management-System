import { useState, useCallback, useRef } from "react";
import apiClient from "../lib/apiClient";
import toast from "react-hot-toast";

export function useModuleEnrollment({ moduleId, moduleTitle, initialEnrolled = false, onEnrollSuccess }) {
  const [localEnrolled, setLocalEnrolled] = useState(initialEnrolled);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const isEnrollingRef = useRef(false);

  const handleEnroll = useCallback(async () => {
    if (isEnrollingRef.current) return;
    isEnrollingRef.current = true;
    setIsEnrolling(true);

    // Optimistically update the UI instantly
    setLocalEnrolled(true);

    try {
      const response = await apiClient.post(`/modules/${moduleId}/enroll`);

      if (response.data.success) {
        toast.success(`Enrollment Success! You are now enrolled in ${moduleTitle}.`);
        if (onEnrollSuccess) onEnrollSuccess(moduleId);
      } else {
        // Rollback if the server indicates failure despite a 200 OK
        setLocalEnrolled(false);
      }
    } catch (error) {
      // Rollback on error
      setLocalEnrolled(false);
      console.error("Enrollment error:", error);
      toast.error(
        error.response?.data?.message || "Failed to enroll in module. Please try again."
      );
    } finally {
      isEnrollingRef.current = false;
      setIsEnrolling(false);
    }
  }, [moduleId, moduleTitle, onEnrollSuccess]);

  return { localEnrolled, isEnrolling, handleEnroll };
}
