import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/apiClient";

// Whether 2FA is on, as decided by the server. Only drives redirects and which
// settings show; the server enforces it. Undefined until the server answers.
export function useMfaEnabled() {
  const { data } = useQuery({
    queryKey: ["authPolicy"],
    queryFn: async () => {
      const res = await apiClient.get("/public/auth-policy");
      return res.data;
    },
    staleTime: Infinity,
  });
  return data?.mfaEnabled;
}
