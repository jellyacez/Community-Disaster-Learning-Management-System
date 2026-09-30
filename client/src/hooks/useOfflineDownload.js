import { useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';
import { localDb } from '../lib/localDb';
import toast from 'react-hot-toast';

export function useOfflineDownload(moduleId) {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Check if the module is already in IndexedDB on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!moduleId) return;
      try {
        const exists = await localDb.module_data.get(moduleId);
        setIsDownloaded(!!exists);
      } catch (err) {
        console.warn("Failed to check offline status:", err);
      }
    };
    checkStatus();
  }, [moduleId]);

  const downloadModule = async () => {
    if (!navigator.onLine) {
      toast.error("You must be online to download this module.");
      return;
    }

    const confirmDownload = window.confirm(
      "Download this module for offline use? This will consume some local storage on your device."
    );
    if (!confirmDownload) return;

    setIsDownloading(true);
    const loadingToast = toast.loading("Downloading module structure...");

    try {
      // 1. Fetch full module data from the server
      const response = await apiClient.get(`/modules/${moduleId}/viewer`);
      const payload = response.data.data;

      if (!payload?.module || !payload?.levels) {
        throw new Error("Invalid module data received.");
      }

      // 2. Save everything structurally to IndexedDB (for progressService calculations)
      await localDb.transaction("rw", localDb.module_data, localDb.levels, localDb.module_steps, async () => {
        await localDb.module_data.put({
          mod_id: payload.module.id,
          modcat: payload.module.category || "General",
          title: payload.module.title
        });

        for (const level of payload.levels) {
          await localDb.levels.put({
            level_id: level.id,
            mod_id: payload.module.id,
            title: level.title,
            level_order: level.level_order
          });

          for (const step of (level.steps || [])) {
            await localDb.module_steps.put({
              step_id: step.id,
              level_id: level.id,
              title: step.title,
              step_type: step.type,
              step_order: step.step_order
            });
          }
        }
      });

      // 3. Save a fast JSON copy to localStorage for the UI to read offline
      localStorage.setItem(`lms_offline_module_${moduleId}`, JSON.stringify(payload));

      setIsDownloaded(true);
      toast.success("Module saved for offline use!", { id: loadingToast });
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download module. Please try again.", { id: loadingToast });
    } finally {
      setIsDownloading(false);
    }
  };

  const removeDownload = async () => {
    const confirmRemove = window.confirm("Remove this module from offline storage to free up space?");
    if (!confirmRemove) return;

    try {
      await localDb.transaction("rw", localDb.module_data, localDb.levels, localDb.module_steps, async () => {
        await localDb.module_data.delete(moduleId);
        const levels = await localDb.levels.where({ mod_id: moduleId }).toArray();
        const levelIds = levels.map(l => l.level_id);

        await localDb.levels.where({ mod_id: moduleId }).delete();
        if (levelIds.length > 0) {
          await localDb.module_steps.where('level_id').anyOf(levelIds).delete();
        }
      });

      localStorage.removeItem(`lms_offline_module_${moduleId}`);
      setIsDownloaded(false);
      toast.success("Offline data removed.");
    } catch (error) {
      toast.error("Failed to remove offline data.");
    }
  };

  return { isDownloaded, isDownloading, downloadModule, removeDownload };
}
