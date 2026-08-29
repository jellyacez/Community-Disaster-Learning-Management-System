import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkBadge01Icon,
  Alert02Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import CertificateLifecycleBadge from "../CertificateLifecycleBadge";

export default function VerificationResultCard({
  certData,
  activeToken,
  onVerifyAnother,
}) {
  const getBannerTheme = (status) => {
    switch (status) {
      case "active":
        return {
          wrapper: "bg-emerald-50/80 border-emerald-200 text-emerald-900",
          iconBg: "bg-emerald-500 text-white",
          icon: CheckmarkBadge01Icon,
          title: "Valid & Active Credential",
        };
      case "expiring_soon":
        return {
          wrapper: "bg-amber-50/80 border-amber-200 text-amber-900",
          iconBg: "bg-amber-500 text-white",
          icon: Alert02Icon,
          title: "Expiring Soon",
        };
      case "expired":
        return {
          wrapper: "bg-red-50/80 border-red-200 text-red-900",
          iconBg: "bg-red-500 text-white",
          icon: Alert02Icon,
          title: "Expired Certificate",
        };
      default:
        return {
          wrapper: "bg-gray-100 border-gray-200 text-gray-800",
          iconBg: "bg-gray-500 text-white",
          icon: Alert02Icon,
          title: "Revoked Certificate",
        };
    }
  };

  const theme = getBannerTheme(certData.status);

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${theme.wrapper}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.iconBg}`}>
            <HugeiconsIcon icon={theme.icon} className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold capitalize">{theme.title}</h3>
            <p className="text-xs opacity-80">
              Token: <span className="font-mono">{activeToken ? `${activeToken.slice(0, 8)}...${activeToken.slice(-4)}` : "N/A"}</span>
            </p>
          </div>
        </div>
        <CertificateLifecycleBadge status={certData.status} />
      </div>

      {/* Certificate Details */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-400 font-medium block">Learner Name</span>
            <span className="text-gray-900 font-bold text-sm block mt-0.5">{certData.learner_name || "N/A"}</span>
          </div>
          <div>
            <span className="text-gray-400 font-medium block">Module Completed</span>
            <span className="text-gray-900 font-bold text-sm block mt-0.5">{certData.module_title || "N/A"}</span>
          </div>
          <div>
            <span className="text-gray-400 font-medium block">Completion Date</span>
            <span className="text-gray-700 font-semibold block mt-0.5">
              {certData.completion_date
                ? new Date(certData.completion_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-gray-400 font-medium block">Expiration Date</span>
            <span className="text-gray-700 font-semibold block mt-0.5">
              {certData.expires_at
                ? new Date(certData.expires_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onVerifyAnother}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-sm cursor-pointer text-xs"
        >
          <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4" />
          <span>Verify Another</span>
        </button>
      </div>
    </div>
  );
}
