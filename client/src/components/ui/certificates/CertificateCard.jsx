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
 * Mirrors ModuleCard's prop convention: receives a single `cert` object
 * shaped from the /user/dashboard API response.
 *
 * cert shape:
 *   cert.verification_token  — string (used as link key & query param)
 *   cert.cert_rec            — string (control number / display ID)
 *   cert.module_title        — string
 *   cert.completion_date     — ISO date string
 *   cert.status              — "active" | "expired" | "revoked"
 */
const STATUS_CONFIG = {
  active: {
    label: "Active",
    badge: "bg-emerald-100 text-emerald-700",
    icon: "bg-red-600",
    card: "border-gray-100",
  },
  expired: {
    label: "Expired",
    badge: "bg-orange-100 text-orange-700",
    icon: "bg-orange-400",
    card: "border-orange-100",
  },
  revoked: {
    label: "Revoked",
    badge: "bg-gray-100 text-gray-500",
    icon: "bg-gray-400",
    card: "border-gray-200",
  },
};

const CertificateCard = memo(function CertificateCard({ cert }) {
  const status = cert.status ?? "active";
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  const isRevoked = status === "revoked";
  const viewUrl = `/user/certificates/view?token=${cert.verification_token}`;

  const issuedDate = cert.completion_date
    ? new Date(cert.completion_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm p-4 flex flex-col gap-3 transition-shadow hover:shadow-md ${
        isRevoked ? `${cfg.card} opacity-60` : cfg.card
      }`}
    >
      {/* Status badge + cert ID */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full ${cfg.badge}`}
        >
          <HugeiconsIcon icon={Award01Icon} className="w-3 h-3" />
          {cfg.label}
        </span>
        <span className="text-xs text-gray-400 font-mono truncate" title={cert.cert_rec}>
          {cert.cert_rec}
        </span>
      </div>

      {/* Title + issued date */}
      <div>
        <h3
          className={`font-black text-base leading-snug truncate ${
            isRevoked ? "text-gray-400 line-through" : "text-gray-900"
          }`}
          title={cert.module_title}
        >
          {cert.module_title}
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">Issued {issuedDate}</p>
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
              className="inline-flex flex-1 justify-center items-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <HugeiconsIcon icon={EyeIcon} className="w-3.5 h-3.5" />
              View
            </Link>
            <Link
              to={viewUrl}
              className="inline-flex flex-1 justify-center items-center gap-1.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-colors"
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
