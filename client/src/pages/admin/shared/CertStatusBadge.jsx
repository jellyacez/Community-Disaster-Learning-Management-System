import StatusBadge from "../../../components/ui/StatusBadge";

// certStatus comes from /admin/residents and follows the accomplishment report roster:
// an active certificate (expiring = lapses within 30 days), otherwise expired, otherwise none
const BADGES = {
  certified: { color: "emerald", label: "Certified" },
  expiring: { color: "amber", label: "Expiring soon" },
  expired: { color: "red", label: "Expired" },
  none: { color: "gray", label: "Not certified" },
};

export default function CertStatusBadge({ status }) {
  const badge = BADGES[status] || BADGES.none;
  return <StatusBadge color={badge.color}>{badge.label}</StatusBadge>;
}
