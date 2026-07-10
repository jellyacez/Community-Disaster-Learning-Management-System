import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Database01Icon, Download01Icon, Alert01Icon } from "@hugeicons/core-free-icons";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";

export default function InfrastructureOperationsPanel() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isDownloadingLogs, setIsDownloadingLogs] = useState(false);
  
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const handleBackup = async () => {
    setShowBackupModal(false);
    setIsBackingUp(true);
    try {
      const response = await apiClient.get("/admin/infrastructure/backup", {
        responseType: "blob",
      });

      if (response.data.type === "application/json") {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || "Failed to generate backup");
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      
      let filename = `backup_cdlms_${new Date().toISOString().slice(0, 10)}.sql`;
      const disposition = response.headers["content-disposition"];
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replace(/"/g, "");
      }
      
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Database backup downloaded successfully!");
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const errorData = JSON.parse(text);
          toast.error(errorData.error || "Failed to generate backup");
        } catch (e) {
          toast.error("Failed to generate backup");
        }
      } else if (err.message && err.message !== "Network Error") {
        toast.error(err.message);
      } else {
        toast.error("Failed to generate backup");
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadLogs = async () => {
    setShowLogsModal(false);
    setIsDownloadingLogs(true);
    try {
      const response = await apiClient.get("/admin/infrastructure/logs", {
        responseType: "blob",
      });

      if (response.data.type === "application/json") {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || "Failed to download logs");
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      
      let filename = `server_error_${new Date().toISOString().slice(0, 10)}.log`;
      const disposition = response.headers["content-disposition"];
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replace(/"/g, "");
      }
      
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Server logs downloaded successfully!");
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const errorData = JSON.parse(text);
          toast.error(errorData.error || "Failed to download logs");
        } catch (e) {
          toast.error("Failed to download logs");
        }
      } else if (err.message && err.message !== "Network Error") {
        toast.error(err.message);
      } else {
        toast.error("Failed to download logs");
      }
    } finally {
      setIsDownloadingLogs(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-bold text-gray-900">Infrastructure Operations</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4 flex-1 w-full">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={Database01Icon} className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">Manual Database Backup</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  Generate and download a full SQL dump of the current PostgreSQL database. This includes all schemas, tables, and records.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBackupModal(true)}
              disabled={isBackingUp}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isBackingUp ? (
                <svg className="animate-spin w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
              )}
              {isBackingUp ? "Generating Backup..." : "Download SQL Backup"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4 flex-1 w-full">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={Alert01Icon} className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">Export Server Error Logs</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  Download the raw Node.js runtime logs (.log) to diagnose API failures, uncaught exceptions, and console errors.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLogsModal(true)}
              disabled={isDownloadingLogs}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isDownloadingLogs ? (
                <svg className="animate-spin w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
              )}
              {isDownloadingLogs ? "Downloading..." : "Download .log File"}
            </button>
          </div>
        </div>
      </div>

      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <HugeiconsIcon icon={Database01Icon} className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              Download Database Backup?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will generate and download a complete SQL dump of the PostgreSQL database, including all schemas and records.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBackupModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-lg transition-colors"
                disabled={isBackingUp}
              >
                Cancel
              </button>
              <button
                onClick={handleBackup}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
                disabled={isBackingUp}
              >
                Download SQL
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <HugeiconsIcon icon={Alert01Icon} className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              Export Server Logs?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will securely download the raw Node.js runtime `.log` file containing system crashes and errors.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogsModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-lg transition-colors"
                disabled={isDownloadingLogs}
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadLogs}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
                disabled={isDownloadingLogs}
              >
                Download .log
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
