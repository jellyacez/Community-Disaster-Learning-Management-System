import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

export default function CriticalAlertBanner() {
  // Local state to track which alerts the admin has intentionally hidden.
  // This state is cleared when the page refreshes, satisfying backend authority.
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  const { data, isError } = useQuery({
    queryKey: ["activeAlerts"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/alerts/active");
      return res.data.data;
    },
    refetchInterval: 60000, // Poll every 60 seconds
  });

  const alerts = data || [];

  // Filter out alerts that the user has clicked [X] on
  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.includes(alert.id));

  if (isError || visibleAlerts.length === 0) return null;

  const handleDismiss = (id) => {
    setDismissedAlerts(prev => [...prev, id]);
  };

  return (
    <div className="w-full flex flex-col shrink-0">
      {visibleAlerts.map(alert => (
        <div 
          key={alert.id}
          className={`flex items-start sm:items-center justify-between px-6 py-3 border-b
            ${alert.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-900'}
          `}
        >
          <div className="flex items-start sm:items-center gap-3">
            <HugeiconsIcon icon={Alert01Icon} className={`w-5 h-5 shrink-0 ${alert.type === 'warning' ? 'text-amber-600' : 'text-red-600'} mt-0.5 sm:mt-0`} />
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="font-bold sm:mr-2 uppercase tracking-wide text-xs">{alert.title}:</span>
              <span className="text-sm font-medium opacity-90">{alert.message}</span>
            </div>
          </div>
          <button 
            onClick={() => handleDismiss(alert.id)}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/5 ml-4 shrink-0"
            aria-label="Dismiss alert"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4 opacity-70" />
          </button>
        </div>
      ))}
    </div>
  );
}
