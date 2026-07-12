import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../../lib/apiClient";
import { authClient } from "../../../lib/auth-client";

export function useDangerZone() {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const navigate = useNavigate();

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const response = await apiClient.get("/users/me/export", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute("download", `BacolorLMS_Data_Export_${date}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("Data exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleDeactivate = useCallback(async () => {
    setIsDeactivating(true);
    try {
      await apiClient.delete("/users/me");
      await authClient.signOut({
         fetchOptions: {
           onSuccess: () => {
             navigate("/signin", { replace: true });
           }
         }
      });
      // Fallback redirect if signOut doesn't automatically trigger it
      navigate("/signin", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Failed to deactivate account");
      setIsDeactivating(false);
      setShowDeactivateModal(false);
    }
  }, [navigate]);

  return {
    state: {
      isExporting,
      isDeactivating,
      showDeactivateModal,
    },
    actions: {
      setShowDeactivateModal,
      handleExport,
      handleDeactivate,
    }
  };
}
