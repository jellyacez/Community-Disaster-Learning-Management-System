import StatCard from "../../../../../components/ui/StatCard";
import {
  Award01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  CancelCircleIcon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";

export default function CertAnalyticsKPIs({ summary, isLoading }) {
  const cards = [
    {
      label: "Total Certified",
      value: summary?.total_certified ?? 0,
      sub: "Conferred certificates",
      icon: Award01Icon,
      color: "blue",
    },
    {
      label: "Active",
      value: summary?.active_count ?? 0,
      sub: "Valid & compliant",
      icon: CheckmarkCircle01Icon,
      color: "green",
    },
    {
      label: "Expiring Soon",
      value: summary?.expiring_soon_count ?? 0,
      sub: "Expires in < 30 days",
      icon: Clock01Icon,
      color: "amber",
    },
    {
      label: "Expired",
      value: summary?.expired_count ?? 0,
      sub: "Action required / re-train",
      icon: CancelCircleIcon,
      color: "red",
    },
    {
      label: "Revoked",
      value: summary?.revoked_count ?? 0,
      sub: "Admin revoked credentials",
      icon: AlertCircleIcon,
      color: "gray",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => (
        <StatCard
          key={idx}
          label={card.label}
          value={card.value}
          sub={card.sub}
          icon={card.icon}
          color={card.color}
          loading={isLoading}
        />
      ))}
    </div>
  );
}
