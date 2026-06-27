import { useState, useCallback, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export function useModuleEnrollment({ moduleId, moduleTitle, initialEnrolled = false, onEnrollSuccess }) {
  const [localEnrolled, setLocalEnrolled] = useState(initialEnrolled);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const isEnrollingRef = useRef(false);

  const handleEnroll = useCallback(async () => {
    if (isEnrollingRef.current) return;
    isEnrollingRef.current = true;
    setIsEnrolling(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/modules/${moduleId}/enroll`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success(`Enrollment Success! You are now enrolled in ${moduleTitle}.`);
        setLocalEnrolled(true);
        if (onEnrollSuccess) onEnrollSuccess(moduleId);
      }
    } catch (error) {
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
