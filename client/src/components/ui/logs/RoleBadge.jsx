import React from 'react';

const ROLE_COLORS = {
  system_admin: "bg-red-100 text-red-800",
  head_mdrrmo_admin: "bg-purple-100 text-purple-800",
  mdrrmo_admin: "bg-blue-100 text-blue-800",
  barangay_admin: "bg-teal-100 text-teal-800",
  resident: "bg-gray-100 text-gray-600",
};

const ROLE_LABELS = {
  system_admin: "System Admin",
  head_mdrrmo_admin: "Head Admin",
  mdrrmo_admin: "MDRRMO Admin",
  barangay_admin: "Barangay Admin",
  resident: "Resident",
};

export default function RoleBadge({ role }) {
  const colorClass = ROLE_COLORS[role] || "bg-gray-100 text-gray-600";
  const label = ROLE_LABELS[role] || role || "—";
  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-full ${colorClass}`}>
      {label}
    </span>
  );
}
