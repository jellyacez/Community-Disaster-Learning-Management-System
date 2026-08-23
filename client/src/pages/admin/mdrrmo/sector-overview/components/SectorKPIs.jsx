import { StarAward01Icon, Alert01Icon, UserGroupIcon, Home01Icon } from "@hugeicons/core-free-icons";
import StatCard from "../../../system/overview/components/StatCard";

export default function SectorKPIs({ kpiData = {}, trends, isLoading }) {
  const k = kpiData || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        icon={StarAward01Icon}
        label="Avg Completion Rate"
        value={k.avgCompletionRate ?? 0}
        suffix="%"
        sub="Across active barangays"
        color="green"
        isNumeric={true}
        trend={
          k.mostActiveRate > 0
            ? {
                direction: "up",
                color: "green",
                text: `${k.mostActiveName} leading (${k.mostActiveRate}%)`,
              }
            : {
                direction: "flat",
                color: "gray",
                text: "No completions yet",
              }
        }
        loading={isLoading}
      />
      <StatCard
        icon={Alert01Icon}
        label="Below Threshold"
        value={k.belowThreshold ?? 0}
        sub="Sectors with 0% completion"
        color="red"
        trend={trends?.belowThreshold}
        loading={isLoading}
      />
      <StatCard
        icon={UserGroupIcon}
        label="Certified Responders"
        value={k.totalCertified ?? 0}
        sub="Residents with active certs"
        color="blue"
        trend={trends?.certifiedResponders}
        loading={isLoading}
      />
      <StatCard
        icon={Home01Icon}
        label="Barangays Covered"
        value={(k.coveredBarangays ?? 0) + " / 21"}
        sub="Sectors with registered users"
        color="purple"
        isNumeric={false}
        trend={trends?.coveredBarangays}
        loading={isLoading}
      />
    </div>
  );
}
