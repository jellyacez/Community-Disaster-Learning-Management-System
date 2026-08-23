import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";

export function useCertAnalytics() {
  return useQuery({
    queryKey: ["mdrrmoCertAnalytics"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/mdrrmo/certifications/analytics");
      return res.data.data;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
