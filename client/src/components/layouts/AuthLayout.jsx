import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Shield01Icon } from "@hugeicons/core-free-icons";

// Back sits top-left where people look for it, in gray so red stays reserved for the main action
const backLinkClass =
  "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap text-sm text-gray-600 font-semibold hover:text-gray-950 hover:underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-gray-900 rounded-md px-1 -ml-1 cursor-pointer";

// Shared shell for the auth pages, carrying the same brand lockup as the landing page navbar
export default function AuthLayout({
  children,
  title,
  subtitle,
  backLink = "/",
  backText = "Back to home",
  onBackClick,
}) {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4 py-10 transition-colors">
      <div className="auth-isolated w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 px-5 py-7 sm:p-8">
        {onBackClick ? (
          <button type="button" onClick={onBackClick} className={backLinkClass}>
            <HugeiconsIcon aria-hidden="true" icon={ArrowLeft01Icon} className="w-4 h-4" />
            {backText}
          </button>
        ) : (
          <Link to={backLink} className={backLinkClass}>
            <HugeiconsIcon aria-hidden="true" icon={ArrowLeft01Icon} className="w-4 h-4" />
            {backText}
          </Link>
        )}

        <Link
          to="/"
          aria-label="Bacolor Disaster LMS — home"
          className="mt-4 mb-8 flex w-fit min-h-11 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
            <HugeiconsIcon aria-hidden="true" icon={Shield01Icon} className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight whitespace-nowrap">
            <p className="text-xs text-gray-600 font-medium">Pampanga, Philippines</p>
            <p className="text-sm font-bold text-gray-800">Bacolor Disaster LMS</p>
          </div>
        </Link>

        <h1 className={`text-3xl font-extrabold tracking-tight text-gray-950 text-balance ${subtitle ? "" : "mb-6"}`}>{title}</h1>
        {subtitle && <p className="mt-2 mb-6 text-sm text-gray-600 text-pretty">{subtitle}</p>}

        {children}
      </div>
    </main>
  );
}
