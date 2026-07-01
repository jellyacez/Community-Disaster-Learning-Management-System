export default function UserStatusBadge({ user }) {
  if (user.banned) return <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full">Banned</span>;
  if (user.archived) return <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">Archived</span>;
  return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">Active</span>;
}
