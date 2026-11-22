import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  Clock01Icon,
  CancelCircleIcon,
  Alert02Icon,
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
    color: "red",
    label: "Revoked",
    icon: CancelCircleIcon,
  },
};

// An unrecognised status must never read as valid.
const UNKNOWN_STATUS = {
  color: "gray",
  label: "Cannot verify",
  icon: Alert02Icon,
};

export default function CertificateLifecycleBadge({ status, className = "" }) {
  const config = Object.hasOwn(STATUS_MAP, status)
    ? STATUS_MAP[status]
    : UNKNOWN_STATUS;

  return (
    <StatusBadge color={config.color} className={`inline-flex items-center gap-1.5 ${className}`}>
      <HugeiconsIcon icon={config.icon} className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </StatusBadge>
  );
}
