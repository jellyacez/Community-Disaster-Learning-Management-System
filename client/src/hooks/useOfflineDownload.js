import { useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';
import { localDb } from '../lib/localDb';
import toast from 'react-hot-toast';

export function useOfflineDownload(moduleId) {
  const [isDownloaded, setIsDownloaded] = useState(() => {
    // Check localStorage immediately on initial render (fixes cold-boot flash)
    try {
      return Boolean(localStorage.getItem(`lms_offline_module_${moduleId}`));
    } catch {
      return false;
    }
  });
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (!moduleId) return;
      try {
        const localCopy = localStorage.getItem(`lms_offline_module_${moduleId}`);
        if (localCopy) {
          setIsDownloaded(true);
          return;
        }
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

    setIsDownloading(true);
    const loadingToast = toast.loading("Downloading module structure & quizzes...");

    try {
      const response = await apiClient.get(`/modules/${moduleId}/viewer`);
      const payload = response.data.data;

      if (!payload?.module || !payload?.levels) {
        throw new Error("Invalid module data received.");
      }

      // Cache all step assessments locally
      for (const level of (payload.levels || [])) {
        for (const step of (level.steps || [])) {
          if (["quiz", "situational", "priority_action", "hazard_identification", "action_sequence"].includes(step.type)) {
            try {
              const quizRes = await apiClient.get(`/modules/steps/${step.id}/assessment`);
              localStorage.setItem(`lms_offline_assessment_${step.id}`, JSON.stringify(quizRes.data?.data || []));
            } catch (e) {
              console.warn(`Could not cache assessment for step ${step.id}`);
            }
          }
        }
      }

      // Save structure to Dexie
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

      // Save fast JSON payload to localStorage
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
    } catch {
      toast.error("Failed to remove offline data.");
    }
  };

  return { isDownloaded, isDownloading, downloadModule, removeDownload };
}
