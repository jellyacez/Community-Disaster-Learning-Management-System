import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Database01Icon, Download01Icon } from "@hugeicons/core-free-icons";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";

export default function InfrastructureOperationsPanel() {
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const response = await apiClient.get("/admin/infrastructure/backup", {
        responseType: "blob", // Important for downloading files
      });

      // Check if the response is actually JSON (an error)
      if (response.data.type === "application/json") {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || "Failed to generate backup");
      }

      // Create a URL for the blob and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      
      // Try to extract filename from content-disposition header if available
      let filename = `backup_cdlms_${new Date().toISOString().slice(0, 10)}.sql`;
      const disposition = response.headers["content-disposition"];
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replace(/"/g, "");
      }
      
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Database backup downloaded successfully!");
    } catch (err) {
      console.error(err);
      
      if (err.response && err.response.data instanceof Blob) {
        // Read blob error text since the backend sent a 500 with a JSON blob
        try {
          const text = await err.response.data.text();
          const errorData = JSON.parse(text);
          toast.error(errorData.error || "Failed to generate backup");
        } catch (e) {
          toast.error("Failed to generate backup");
        }
      } else if (err.message && err.message !== "Network Error") {
        // Fallback to error message if not a Blob response (e.g. timeout)
        toast.error(err.message);
      } else {
        toast.error("Failed to generate backup");
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-bold text-gray-900">Infrastructure Operations</h3>
      </div>
      <div className="p-5">
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
            onClick={handleBackup}
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
      </div>
    </div>
  );
}
