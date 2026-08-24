import { memo } from "react";
import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Award01Icon,
  EyeIcon,
  Download01Icon,
  Calendar03Icon,
  Clock01Icon,
  QrCodeIcon,
} from "@hugeicons/core-free-icons";

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
    label: "Active Credential",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    border: "border-gray-200 hover:border-emerald-300",
  },
  expiring_soon: {
    label: "Expiring Soon",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    border: "border-amber-200 hover:border-amber-300",
  },
  expired: {
    label: "Expired",
    badge: "bg-red-50 text-red-700 border-red-200",
    border: "border-red-200 hover:border-red-300",
  },
  revoked: {
    label: "Revoked",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    border: "border-gray-200 opacity-60",
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
      className={`rounded-2xl border bg-white shadow-sm p-6 flex flex-col justify-between gap-5 transition-all duration-200 hover:shadow-md ${cfg.border}`}
    >
      <div className="space-y-4">
        {/* Top Header Row: Status Badge + Control Number */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full border ${cfg.badge}`}
          >
            <HugeiconsIcon icon={Award01Icon} className="w-3.5 h-3.5" />
            <span>{cfg.label}</span>
          </span>

          <span
            className="text-xs font-mono font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 truncate"
            title={cert.cert_rec}
          >
            {cert.cert_rec}
          </span>
        </div>

        {/* Certificate Title & Subject */}
        <div>
          <h3
            className={`text-lg font-black leading-snug ${
              isRevoked ? "text-gray-400 line-through" : "text-gray-900"
            }`}
            title={cert.module_title}
          >
            {cert.module_title}
          </h3>
          <p className="text-xs font-medium text-gray-500 mt-1">
            Community Disaster Risk Reduction & Management Certification
          </p>
        </div>

        {/* Issued and Validity Details */}
        <div className="grid grid-cols-2 gap-3 py-3 px-3.5 bg-gray-50/80 rounded-xl border border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Issued Date</p>
              <p className="font-semibold text-gray-700">{fmt(cert.completion_date)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Validity Expiration</p>
              <p
                className={`font-semibold ${
                  displayStatus === "expired"
                    ? "text-red-600 font-bold"
                    : displayStatus === "expiring_soon"
                    ? "text-amber-600 font-bold"
                    : "text-gray-700"
                }`}
              >
                {fmt(cert.expires_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        {isRevoked ? (
          <button
            disabled
            className="w-full py-2.5 bg-gray-100 text-gray-400 text-xs font-bold rounded-xl cursor-not-allowed text-center"
          >
            Credential Revoked
          </button>
        ) : (
          <>
            <Link
              to={viewUrl}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <HugeiconsIcon icon={EyeIcon} className="w-4 h-4" />
              <span>View Certificate</span>
            </Link>

            <Link
              to={viewUrl}
              className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 border text-xs font-bold rounded-xl transition-colors ${
                isInactive
                  ? "bg-gray-50 border-gray-200 text-gray-400 pointer-events-none"
                  : "bg-white border-gray-300 hover:bg-gray-50 text-gray-700 shadow-xs"
              }`}
            >
              <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
              <span>Download PDF</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
});

export default CertificateCard;
