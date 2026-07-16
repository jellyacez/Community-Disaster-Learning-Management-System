import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../../../lib/apiClient";

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

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
      const response = await apiClient.put("/users/me/settings", newSettings);
      return response.data.settings;
    },
    onMutate: async (newSettings) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["userSettings"] });
      const previousSettings = queryClient.getQueryData(["userSettings"]);
      queryClient.setQueryData(["userSettings"], newSettings);
      return { previousSettings };
    },
    onError: (err, newSettings, context) => {
      queryClient.setQueryData(["userSettings"], context.previousSettings);
      toast.error("Failed to save preference.");
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
