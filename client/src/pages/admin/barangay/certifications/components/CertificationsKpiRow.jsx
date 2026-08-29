import {
  Award01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  CancelCircleIcon,
  UnavailableIcon,
} from "@hugeicons/core-free-icons";
import StatCard from "../../../../../components/ui/StatCard";

export default function CertificationsKpiRow({
  summary = { total: 0, active: 0, expiring_soon: 0, expired: 0, revoked: 0 },
  isLoading = false,
  selectedStatus = "",
  onStatusFilterChange,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Total Certified */}
      <StatCard
        icon={Award01Icon}
        color="blue"
        label="Total Certified"
        value={summary.total}
        sub="Conferred certificates"
        loading={isLoading}
        onClick={() => onStatusFilterChange("")}
        isActive={selectedStatus === ""}
      />

      {/* Active */}
      <StatCard
        icon={CheckmarkCircle01Icon}
        color="green"
        label="Active"
        value={summary.active}
        sub="Valid & compliant"
        loading={isLoading}
        onClick={() => onStatusFilterChange("active")}
        isActive={selectedStatus === "active"}
      />

      {/* Expiring Soon */}
      <StatCard
        icon={Clock01Icon}
        color="amber"
        label="Expiring Soon"
        value={summary.expiring_soon}
        sub="Expires in < 30 days"
        loading={isLoading}
        onClick={() => onStatusFilterChange("expiring_soon")}
        isActive={selectedStatus === "expiring_soon"}
      />

      {/* Expired */}
      <StatCard
        icon={CancelCircleIcon}
        color="red"
        label="Expired"
        value={summary.expired}
        sub="Action required / re-train"
        loading={isLoading}
        onClick={() => onStatusFilterChange("expired")}
        isActive={selectedStatus === "expired"}
      />

      {/* Revoked */}
      <StatCard
        icon={UnavailableIcon}
        color="gray"
        label="Revoked"
        value={summary.revoked}
        sub="Admin revoked"
        loading={isLoading}
        onClick={() => onStatusFilterChange("revoked")}
        isActive={selectedStatus === "revoked"}
      />
    </div>
  );
}
