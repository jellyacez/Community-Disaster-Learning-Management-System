import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, RefreshIcon } from "@hugeicons/core-free-icons";

export default function VerificationErrorState({
  verifyError,
  onTryAnother,
}) {
  const getErrorContent = () => {
    switch (verifyError) {
      case "INVALID_TOKEN":
        return {
          title: "Invalid Token Format",
          description: "Please provide a valid 36-character UUID token or verification QR URL.",
        };
      case "NOT_FOUND":
        return {
          title: "Certificate Not Found",
          description: "No valid certification matches this token. It may have been entered incorrectly or never issued.",
        };
      case "RATE_LIMIT":
        return {
          title: "Rate Limit Exceeded",
          description: "Too many verification requests. Please wait a moment before trying again.",
        };
      default:
        return {
          title: "Verification Failed",
          description: "Unable to complete verification at this time. Please check your network connection.",
        };
    }
  };

  const { title, description } = getErrorContent();

  return (
    <div className="text-center py-6 px-4 bg-red-50 rounded-2xl border border-red-200 space-y-3 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mx-auto">
        <HugeiconsIcon icon={Alert02Icon} className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-red-900">{title}</h3>
        <p className="text-xs text-red-600 mt-1 max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onTryAnother}
        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-red-300 text-red-700 hover:bg-red-50 font-bold rounded-xl text-xs transition cursor-pointer shadow-sm"
      >
        <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" />
        <span>Try Another Token</span>
      </button>
    </div>
  );
}
