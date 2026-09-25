import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../../../lib/apiClient";
import { saveOfflineNotification } from "../../../lib/LocalSave/progressService";
import { authClient } from "../../../lib/auth-client";

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const { data: settings, isLoading } = useQuery({
    queryKey: ["userSettings"],
    queryFn: async () => {
      const response = await apiClient.get("/users/me/settings");
      return response.data;
    },
    // Set default initial data while fetching
    initialData: { announcements: true, reminders: true },
  });

  const mutation = useMutation({
    mutationFn: async (newSettings) => {

      if (!userId) throw new Error("User not authenticated");

      if (!navigator.onLine) {
        const res = await saveOfflineNotification(userId, newSettings);
        if (res?.status === 'failed') {
          throw new Error(res.error || "Storage failed. Notification preferences could not be saved offline.");
        }
        return { settings: newSettings, ...res };
      }

      try {
        const response = await apiClient.put("/users/me/settings", newSettings);
        return response.data.settings;
      } catch (error) {
        if (!error.response || error.code === "ERR_NETWORK") {
          const res = await saveOfflineNotification(userId, newSettings);
          if (res?.status === 'failed') {
            throw new Error(res.error || "Storage failed. Notification preferences could not be saved offline.");
          }
          return { settings: newSettings, ...res };
        }
        throw error;
      }
    },

    onMutate: async (newSettings) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["userSettings"] });
      const previousSettings = queryClient.getQueryData(["userSettings"]);
      queryClient.setQueryData(["userSettings"], newSettings);
      return { previousSettings };
    },
    onSuccess: (data) => {
      if (data?.status === 'queued_memory_only') {
        toast(data.warning || "Storage restricted: Preferences saved in memory for this session only.", {
          icon: "⚠️",
          duration: 6000,
        });
      } else if (data?.status === 'queued') {
        toast.success("Notification preferences saved locally.", { icon: "📦" });
      }
    },
    onError: (err, newSettings, context) => {
      queryClient.setQueryData(["userSettings"], context.previousSettings);
      toast.error(err.message || "Failed to save preference.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
    },
  });

  const updatePreference = useCallback((key, value) => {
    mutation.mutate({
      ...settings,
      [key]: value,
    });
  }, [mutation, settings]);


  return {
    settings,
    isLoading,
    updatePreference,
  };
}
