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
        <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={Database01Icon} className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-900">Manual Database Backup</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-md">
              Generate and download a full SQL dump of the current PostgreSQL database. This includes all schemas, tables, and records.
            </p>
          </div>
          <button
            onClick={handleBackup}
            disabled={isBackingUp}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
            {isBackingUp ? "Backing up..." : "Download SQL Backup"}
          </button>
        </div>
      </div>
    </div>
  );
}
