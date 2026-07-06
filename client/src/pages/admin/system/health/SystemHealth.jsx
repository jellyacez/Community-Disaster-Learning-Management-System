import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";

import RuntimeInfoPanel from "../settings/components/RuntimeInfoPanel";
import DatabaseStatusPanel from "../settings/components/DatabaseStatusPanel";

export default function SystemHealth() {
  useDocumentTitle("System Health | Admin Console");

  const { data: settingsData, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/settings");
      return res.data.data;
    },
  });

  const { data: healthData } = useQuery({
    queryKey: ["systemHealth"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/health");
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor runtime environment and infrastructure observability.
        </p>
      </div>

      <RuntimeInfoPanel settingsData={settingsData} isLoading={isSettingsLoading} />
      <DatabaseStatusPanel healthData={healthData} />
    </div>
  );
}
