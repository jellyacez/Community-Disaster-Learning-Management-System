import StatusBadge from "../../../../../components/ui/StatusBadge";

export default function UserStatusBadge({ user }) {
  if (user.banned) return <StatusBadge color="red">Banned</StatusBadge>;
  if (user.archived) return <StatusBadge color="gray">Archived</StatusBadge>;
  return <StatusBadge color="emerald">Active</StatusBadge>;
}
