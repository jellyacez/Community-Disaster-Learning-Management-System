import { StarAward01Icon, Alert01Icon, UserGroupIcon, Home01Icon } from "@hugeicons/core-free-icons";
import StatCard from "../../../system/overview/components/StatCard";

export default function SectorKPIs({ kpiData, trends, isLoading }) {
  if (!kpiData) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        icon={StarAward01Icon}
        label="Top Completion Rate"
        value={kpiData.mostActiveRate}
        suffix="%"
        sub={`${kpiData.mostActiveName} — Highest performing barangay`}
        color="green"
        isNumeric={true}
        loading={isLoading}
      />
      <StatCard
        icon={Alert01Icon}
        label="Below Threshold"
        value={kpiData.belowThreshold}
        sub="Sectors with 0% completion"
        color="red"
        trend={trends?.belowThreshold}
        loading={isLoading}
      />
      <StatCard
        icon={UserGroupIcon}
        label="Certified Responders"
        value={kpiData.totalCertified}
        sub="Residents with active certs"
        color="blue"
        trend={trends?.certifiedResponders}
        loading={isLoading}
      />
      <StatCard
        icon={Home01Icon}
        label="Barangays Covered"
        value={kpiData.coveredBarangays + " / 21"}
        sub="Sectors with registered users"
        color="purple"
        isNumeric={false}
        trend={trends?.coveredBarangays}
        loading={isLoading}
      />
    </div>
  );
}
