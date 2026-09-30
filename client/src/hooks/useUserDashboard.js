import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/apiClient";

const cacheKeyFor = (userId) =>
  userId ? `lms_offline_dashboard_${userId}` : null;

const read = (key) => {
  if (!key) return undefined;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
};

const write = (key, value) => {
  if (!key || value == null) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
};

export function useUserDashboard(userId) {
  const cacheKey = useMemo(() => cacheKeyFor(userId), [userId]);

  return useQuery({
    queryKey: ["userDashboard", userId || "guest"],
    enabled: Boolean(userId),
    networkMode: "offlineFirst",
    retry: (count, err) => Boolean(err?.response) && count < 2,
    initialData: () => read(cacheKey),
    queryFn: async () => {
      try {
        const res = await apiClient.get("/user/dashboard", { timeout: 8000 });
        write(cacheKey, res.data);
        return res.data;
      } catch (err) {
        if (!err.response) {
          const cached = read(cacheKey);
          if (cached) return cached;
        }
        throw err;
      }
    },
    refetchInterval: () => (navigator.onLine ? 60000 : false),
  });
}
