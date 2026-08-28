import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkBadge01Icon,
  Alert02Icon,
  Cancel01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import Spinner from "../../components/ui/Spinner";

export default function VerifyCertificate() {
  useDocumentTitle("Verify Certificate | Bacolor LMS");
  const [searchParams, setSearchParams] = useSearchParams();
  const [tokenInput, setTokenInput] = useState(searchParams.get("token") || "");
  const [submittedToken, setSubmittedToken] = useState(
    searchParams.get("token") || "",
  );

  const {
    data: certData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["verifyCertificate", submittedToken],
    queryFn: async () => {
      if (!submittedToken) return null;
      try {
        const response = await apiClient.get(
          `/certificates/verify/${submittedToken}`,
        );
        return response.data.data;
      } catch (err) {
        if (err.response && err.response.status === 404) {
          throw new Error("NOT_FOUND");
        }
        if (err.response && err.response.status === 429) {
          throw new Error("RATE_LIMIT");
        }
        throw new Error("SERVER_ERROR");
      }
    },
    enabled: !!submittedToken,
    retry: false,
  });

  const handleVerify = (e) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      setSearchParams({ token: tokenInput.trim() });
      setSubmittedToken(tokenInput.trim());
    }
  };

  const renderContent = () => {
    if (!submittedToken) {
      return (
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 mt-8">
          <HugeiconsIcon
            icon={CheckmarkBadge01Icon}
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
          />
          <p className="text-gray-500 font-medium">
            Enter a verification token above or scan a certificate QR code to check authenticity.
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="text-center p-8 mt-8">
          <Spinner className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Validating credential against MDRRMO records...</p>
        </div>
      );
    }

    if (isError) {
      if (error.message === "NOT_FOUND") {
        return (
          <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200 mt-8 animate-in fade-in">
            <HugeiconsIcon
              icon={Cancel01Icon}
              className="w-16 h-16 text-red-500 mx-auto mb-4"
            />
            <h2 className="text-xl font-black text-red-900 mb-2">
              Certificate Not Found
            </h2>
            <p className="text-red-700 text-sm max-w-md mx-auto leading-relaxed">
              No matching official certificate record was found for this token. The identifier may be invalid, malformed, or fraudulent.
            </p>
          </div>
        );
      }
      if (error.message === "RATE_LIMIT") {
        return (
          <div className="text-center p-8 bg-amber-50 rounded-2xl border border-amber-200 mt-8 animate-in fade-in">
            <HugeiconsIcon
              icon={Alert02Icon}
              className="w-16 h-16 text-amber-600 mx-auto mb-4"
            />
            <h2 className="text-xl font-black text-amber-900 mb-2">
              Verification Rate Limit Exceeded
            </h2>
            <p className="text-amber-700 text-sm max-w-md mx-auto leading-relaxed">
              Too many lookups received from this network. Please wait a few moments before submitting another request.
            </p>
          </div>
        );
      }
      return (
        <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-200 mt-8 animate-in fade-in">
          <HugeiconsIcon
            icon={Alert02Icon}
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
          />
          <h2 className="text-xl font-black text-gray-900 mb-2">Service Unavailable</h2>
          <p className="text-gray-600 text-sm max-w-md mx-auto">
            Unable to connect to the verification registry at this time. Please try again shortly.
          </p>
        </div>
      );
    }

    if (certData) {
      const {
        status,
        learner_name,
        module_title,
        completion_date,
        expires_at,
      } = certData;

      let statusColor = "bg-emerald-50 text-emerald-900 border-emerald-200";
      let statusIcon = (
        <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-7 h-7 text-emerald-600 shrink-0" />
      );
      let statusBadge = "bg-emerald-100 text-emerald-800 border-emerald-200";
      let statusText = "Official & Active";
      let statusDesc = "This credential is valid, accredited, and currently in good standing.";

      if (status === "expired") {
        statusColor = "bg-amber-50 text-amber-900 border-amber-200";
        statusIcon = <HugeiconsIcon icon={Alert02Icon} className="w-7 h-7 text-amber-600 shrink-0" />;
        statusBadge = "bg-amber-100 text-amber-800 border-amber-200";
        statusText = "Expired Credential";
        statusDesc = "This certificate was legitimately earned but has passed its validity period.";
      } else if (status === "revoked") {
        statusColor = "bg-red-50 text-red-900 border-red-200";
        statusIcon = <HugeiconsIcon icon={Cancel01Icon} className="w-7 h-7 text-red-600 shrink-0" />;
        statusBadge = "bg-red-100 text-red-800 border-red-200";
        statusText = "Certificate Revoked";
        statusDesc = "This certificate was formally revoked by municipal administrative authority.";
      }

      return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-8 animate-in fade-in duration-200">
          {/* Status Header Banner */}
          <div className={`p-6 flex items-start gap-4 border-b ${statusColor}`}>
            {statusIcon}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black">{statusText}</h2>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge}`}>
                  {status?.toUpperCase()}
                </span>
              </div>
              <p className="text-xs mt-1 text-gray-600 leading-relaxed">{statusDesc}</p>
            </div>
          </div>

          {/* Core Certificate Meta (Data Minimization: Strictly Non-Sensitive) */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 font-mono">
                  Learner Name
                </p>
                <p className="text-lg font-black text-gray-900">
                  {learner_name || "Archived Resident"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 font-mono">
                  Training Module
                </p>
                <p className="text-lg font-black text-gray-900">
                  {module_title}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 font-mono">
                  Issue / Completion Date
                </p>
                <p className="text-sm font-semibold text-gray-800">
                  {completion_date
                    ? new Date(completion_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 font-mono">
                  Validity / Expiration Date
                </p>
                <p className="text-sm font-semibold text-gray-800">
                  {expires_at
                    ? new Date(expires_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Lifetime / No Expiry"}
                </p>
              </div>
            </div>

            {/* Issuing Authority Badge */}
            <div className="pt-6 border-t border-gray-100 flex items-center gap-3.5 bg-gray-50/80 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-5 sm:px-8">
              <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900">
                  Issued under the Authority of Bacolor MDRRMO & Local DRRMC
                </p>
                <p className="text-[11px] text-gray-500">
                  Municipality of Bacolor, Province of Pampanga • Official Disaster Readiness Record
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full">
        {/* Portal Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full text-xs font-bold mb-3">
            <HugeiconsIcon icon={Shield01Icon} className="w-4 h-4 text-red-600" />
            <span>Official DRRM Public Registry</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Certificate Verification
          </h1>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Verify the authenticity, accreditation, and current status of a Bacolor MDRRMO training credential.
          </p>
        </div>

        {/* Verification Input Form */}
        <form
          onSubmit={handleVerify}
          className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100"
        >
          <label
            htmlFor="token"
            className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 font-mono"
          >
            Verification Token (UUID)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              id="token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
              className="flex-1 rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 font-mono text-sm outline-none transition"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 active:bg-red-800 transition shadow-md shadow-red-600/20 cursor-pointer shrink-0"
            >
              Verify Certificate
            </button>
          </div>
        </form>

        {renderContent()}
      </div>

      {/* R.A. 10173 Data Privacy Compliance Notice */}
      <footer className="mt-12 text-center text-xs text-gray-400 max-w-md mx-auto leading-relaxed border-t border-gray-200/60 pt-6">
        <p className="font-semibold text-gray-500 mb-1">
          Republic Act No. 10173 — Data Privacy Act of 2012
        </p>
        <p>
          This public verification portal displays strictly non-sensitive credential status to confirm disaster training compliance. Private contact details and learner identifiers are protected and withheld.
        </p>
        <div className="mt-3">
          <Link to="/" className="text-red-600 font-semibold hover:underline">
            Return to Portal Home
          </Link>
        </div>
      </footer>
    </div>
  );
}

