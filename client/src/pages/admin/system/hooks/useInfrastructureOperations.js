import { useState } from "react";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";

export default function useInfrastructureOperations() {
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [isExportingLogs, setIsExportingLogs] = useState(false);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isDownloadingServerLogs, setIsDownloadingServerLogs] = useState(false);

  const exportSystemLogs = async (onSuccessCallback) => {
    setIsExportingLogs(true);
    try {
      const res = await apiClient.get("/admin/activity-log/export", {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "system_activity_logs.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("System logs exported successfully!");
      if (onSuccessCallback) onSuccessCallback();
    } catch (err) {
      toast.error("Failed to export system logs.");
      console.error(err);
    } finally {
      setIsExportingLogs(false);
    }
  };

  const downloadBackup = async (accountPassword, onSuccessCallback) => {
    if (!accountPassword) {
      toast.error("Enter your account password.");
      return;
    }
    setIsDownloadingBackup(true);
    try {
      const response = await apiClient.post(
        "/admin/infrastructure/backup",
        { accountPassword },
        { responseType: "blob", timeout: 330000 },
      );

      // If the response is actually JSON, it means the API returned an error rather than a blob.
      if (response.data.type === "application/json") {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || "Failed to generate backup");
      }

      const contentDisposition = response.headers["content-disposition"];
      let filename = `backup_cdlms_${new Date().toISOString().slice(0, 10)}.zip`;

      if (contentDisposition && contentDisposition.includes("filename=")) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Database backup downloaded successfully!");
      if (onSuccessCallback) onSuccessCallback();
    } catch (err) {
      // Axios errors contain the request body; do not log submitted passwords.
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const errorData = JSON.parse(text);
          toast.error(errorData.error || "Failed to generate backup");
        } catch {
          toast.error("Failed to generate backup");
        }
      } else if (err.message && err.message !== "Network Error") {
        toast.error(err.message);
      } else {
        toast.error("Failed to generate backup");
      }
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const downloadServerLogs = async (onSuccessCallback) => {
    setIsDownloadingServerLogs(true);
    try {
      const response = await apiClient.get("/admin/infrastructure/logs", {
        responseType: "blob",
      });

      if (response.data.type === "application/json") {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || "Failed to download logs");
      }

      const contentDisposition = response.headers["content-disposition"];
      let filename = `server_error_${new Date().toISOString().slice(0, 10)}.log`;

      if (contentDisposition && contentDisposition.includes("filename=")) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }

      const blob = new Blob([response.data], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Server logs downloaded successfully!");
      if (onSuccessCallback) onSuccessCallback();
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const errorData = JSON.parse(text);
          toast.error(errorData.error || "Failed to download logs");
        } catch {
          toast.error("Failed to download logs");
        }
      } else if (err.message && err.message !== "Network Error") {
        toast.error(err.message);
      } else {
        toast.error("Failed to download logs");
      }
    } finally {
      setIsDownloadingServerLogs(false);
    }
  };

  const restoreBackup = async (file, password, confirmation, onSuccess) => {
    setIsRestoringBackup(true);
    try {
      const body = new FormData();
      body.append("backup", file);
      body.append("password", password);
      body.append("confirmation", confirmation);
      const response = await apiClient.post(
        "/admin/infrastructure/restore",
        body,
        { headers: { "Content-Type": undefined }, timeout: 330000 },
      );
      toast.success(response.data.message);
      onSuccess?.();
    } catch (error) {
      toast.error(error.response?.data?.error || "Restore failed.");
    } finally {
      setIsRestoringBackup(false);
    }
  };
  return {
    restoreBackup,
    isRestoringBackup,
    exportSystemLogs,
    isExportingLogs,
    downloadBackup,
    isDownloadingBackup,
    downloadServerLogs,
    isDownloadingServerLogs,
  };
}
