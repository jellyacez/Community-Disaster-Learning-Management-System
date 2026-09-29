import { useEffect, useState, useMemo } from "react";
import apiClient from "../../../../lib/apiClient";
import SuperMissionBanner from "./components/SuperMissionBanner";
import PrimaryMetricsCards from "./components/PrimaryMetricsCards";
import BarangayTelemetryChart from "./components/BarangayTelemetryChart";
import BarangayTenancyMatrix from "./components/BarangayTenancyMatrix";
import PlatformTelemetry from "./components/PlatformTelemetry";

const DEFAULT_BACOLOR_BARANGAYS = [
  "Balas", "Cabalantian", "Cabambangan", "Cabetican", "Calibutbut",
  "Concepcion", "Dolores", "Duat", "Macabacle", "Magliman",
  "Maliwalu", "Mesalipit", "Paralayunan", "Potrero", "San Antonio",
  "San Isidro", "San Vicente", "Santa Barbara", "Santa Ines", "Talba", "Tinajero"
];

export default function SuperOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timelineData, setTimelineData] = useState([]);

  useEffect(() => {
    Promise.allSettled([
      apiClient.get("/admin/stats"),
      apiClient.get("/admin/super/analytics/barangays"),
    ])
      .then(([statsRes, analyticsRes]) => {
        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value.data?.data || statsRes.value.data);
        }

        if (analyticsRes.status === "fulfilled") {
          const list = analyticsRes.value.data?.data || [];
          if (Array.isArray(list) && list.length > 0) {
            setTimelineData(list);
          } else {
            setTimelineData(
              DEFAULT_BACOLOR_BARANGAYS.map((name, idx) => ({
                id: idx + 1,
                name,
                residents: 0,
                trained: 0,
              }))
            );
          }
        }
      })
      .catch((err) => console.error("Failed to load overview telemetry", err))
      .finally(() => setLoading(false));
  }, []);

  const barangayList = useMemo(() => {
    return timelineData.length > 0
      ? timelineData.map((b) => b.name)
      : DEFAULT_BACOLOR_BARANGAYS;
  }, [timelineData]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <SuperMissionBanner />
      
      <PrimaryMetricsCards 
        stats={stats} 
        loading={loading} 
        totalBarangaysCount={barangayList.length} 
      />

      <BarangayTelemetryChart timelineData={timelineData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BarangayTenancyMatrix barangays={barangayList} />
        <PlatformTelemetry />
      </div>
    </div>
  );
}