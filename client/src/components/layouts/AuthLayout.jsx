import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Shield01Icon } from "@hugeicons/core-free-icons";

export default function AuthLayout({
  children,
  title,
  subtitle,
  backLink = "/",
  backText = "Back to Landing Page",
  icon = Shield01Icon,
  onBackClick,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-red-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        {onBackClick ? (
          <button
            onClick={onBackClick}
            className="inline-flex items-center gap-2 text-sm text-red-600 font-semibold hover:underline mb-6 outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-md px-1 -ml-1 cursor-pointer"
          >
            <HugeiconsIcon aria-hidden="true" icon={ArrowLeft01Icon} className="w-4 h-4" />
            {backText}
          </button>
        ) : (
          <Link
            to={backLink}
            className="inline-flex items-center gap-2 text-sm text-red-600 font-semibold hover:underline mb-6 outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-md px-1 -ml-1"
          >
            <HugeiconsIcon aria-hidden="true" icon={ArrowLeft01Icon} className="w-4 h-4" />
            {backText}
          </Link>
        )}

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
            <HugeiconsIcon aria-hidden="true" icon={icon} className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
