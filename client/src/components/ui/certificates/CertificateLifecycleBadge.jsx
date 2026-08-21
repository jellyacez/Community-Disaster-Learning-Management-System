import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  Clock01Icon,
  CancelCircleIcon,
  UnavailableIcon,
} from "@hugeicons/core-free-icons";
import StatusBadge from "../StatusBadge";

const STATUS_MAP = {
  active: {
    color: "emerald",
    label: "Active",
    icon: CheckmarkCircle01Icon,
  },
  expiring_soon: {
    color: "amber",
    label: "Expiring Soon",
    icon: Clock01Icon,
  },
  expired: {
    color: "red",
    label: "Expired",
    icon: CancelCircleIcon,
  },
  revoked: {
    color: "gray",
    label: "Revoked",
    icon: UnavailableIcon,
  },
};

export default function CertificateLifecycleBadge({ status, className = "" }) {
  const config = STATUS_MAP[status] || STATUS_MAP.active;

  return (
    <StatusBadge color={config.color} className={`inline-flex items-center gap-1.5 ${className}`}>
      <HugeiconsIcon icon={config.icon} className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </StatusBadge>
  );
}
