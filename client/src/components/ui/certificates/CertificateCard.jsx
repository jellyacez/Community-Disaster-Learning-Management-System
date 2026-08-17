import { memo } from "react";
import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Award01Icon,
  EyeIcon,
  Download01Icon,
} from "@hugeicons/core-free-icons";

/**
 * CertificateCard
 *
 * cert shape (from /user/dashboard):
 *   cert.verification_token  — string
 *   cert.cert_rec            — string (control number)
 *   cert.module_title        — string
 *   cert.completion_date     — ISO date string
 *   cert.expires_at          — ISO date string | null
 *   cert.status              — "active" | "expired" | "revoked"
 */

/** Derive a display-level status that includes "expiring_soon" */
function resolveStatus(cert) {
  if (cert.status === "revoked") return "revoked";
  if (cert.status === "expired") return "expired";
  if (cert.expires_at) {
    const msLeft = new Date(cert.expires_at) - Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (msLeft > 0 && msLeft <= thirtyDaysMs) return "expiring_soon";
  }
  return "active";
}

const STATUS_CONFIG = {
  active: {
    label: "Active",
    badge: "bg-green-100 text-green-800",
    iconBg: "bg-red-600",
    card: "border-gray-100",
  },
  expiring_soon: {
    label: "Expiring Soon",
    badge: "bg-amber-100 text-amber-800",
    iconBg: "bg-amber-500",
    card: "border-amber-100",
  },
  expired: {
    label: "Expired",
    badge: "bg-red-100 text-red-800",
    iconBg: "bg-red-400",
    card: "border-red-100",
  },
  revoked: {
    label: "Revoked",
    badge: "bg-gray-100 text-gray-800",
    iconBg: "bg-gray-400",
    card: "border-gray-200",
  },
};

const fmt = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const CertificateCard = memo(function CertificateCard({ cert }) {
  const displayStatus = resolveStatus(cert);
  const cfg = STATUS_CONFIG[displayStatus] ?? STATUS_CONFIG.active;
  const isRevoked = cert.status === "revoked";
  const isInactive = cert.status === "expired" || isRevoked;
  const viewUrl = `/user/certificates/view?token=${cert.verification_token}`;

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm p-4 flex flex-col gap-3 transition-shadow hover:shadow-md ${cfg.card} ${
        isRevoked ? "opacity-60" : ""
      }`}
    >
      {/* Top row: status badge + cert ID */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}
        >
          <HugeiconsIcon icon={Award01Icon} className="w-3 h-3" />
          {cfg.label}
        </span>
        <span
          className="text-xs text-gray-400 font-mono truncate max-w-[120px]"
          title={cert.cert_rec}
        >
          {cert.cert_rec}
        </span>
      </div>

      {/* Title */}
      <div>
        <h3
          className={`font-black text-base leading-snug ${
            isRevoked ? "text-gray-400 line-through" : "text-gray-900"
          }`}
          title={cert.module_title}
        >
          {cert.module_title}
        </h3>

        {/* Issued + Expires dates */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
          <p className="text-xs text-gray-500">
            Issued: <span className="font-medium text-gray-700">{fmt(cert.completion_date)}</span>
          </p>
          {cert.expires_at && (
            <p className={`text-xs ${displayStatus === "expired" ? "text-red-500 font-semibold" : displayStatus === "expiring_soon" ? "text-amber-600 font-semibold" : "text-gray-500"}`}>
              Expires: <span className="font-medium">{fmt(cert.expires_at)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto">
        {isRevoked ? (
          <button
            disabled
            className="flex-1 py-2 bg-gray-100 text-gray-400 text-xs font-bold rounded-xl cursor-not-allowed text-center"
          >
            Unavailable
          </button>
        ) : (
          <>
            <Link
              to={viewUrl}
              className="inline-flex flex-1 justify-center items-center gap-1.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition-colors"
            >
              <HugeiconsIcon icon={EyeIcon} className="w-3.5 h-3.5" />
              View
            </Link>
            <Link
              to={viewUrl}
              className={`inline-flex flex-1 justify-center items-center gap-1.5 py-2 border text-xs font-bold rounded-xl transition-colors ${
                isInactive
                  ? "bg-gray-50 border-gray-200 text-gray-400 pointer-events-none"
                  : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
              }`}
            >
              <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5" />
              Download
            </Link>
          </>
        )}
      </div>
    </div>
  );
});

export default CertificateCard;
