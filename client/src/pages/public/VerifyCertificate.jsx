import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkBadge01Icon,
  Alert02Icon,
  Cancel01Icon,
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
        return response.data;
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
          <p className="text-gray-500">
            Enter a verification token above to check the authenticity of a
            certificate.
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="text-center p-8 mt-8">
          <Spinner className="w-8 h-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Verifying certificate...</p>
        </div>
      );
    }

    if (isError) {
      if (error.message === "NOT_FOUND") {
        return (
          <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200 mt-8">
            <HugeiconsIcon
              icon={Cancel01Icon}
              className="w-16 h-16 text-red-500 mx-auto mb-4"
            />
            <h2 className="text-xl font-bold text-red-800 mb-2">
              Certificate Not Found
            </h2>
            <p className="text-red-600">
              No valid certificate matches this verification token. It may be
              malformed or non-existent.
            </p>
          </div>
        );
      }
      if (error.message === "RATE_LIMIT") {
        return (
          <div className="text-center p-8 bg-orange-50 rounded-2xl border border-orange-200 mt-8">
            <HugeiconsIcon
              icon={Alert02Icon}
              className="w-16 h-16 text-orange-500 mx-auto mb-4"
            />
            <h2 className="text-xl font-bold text-orange-800 mb-2">
              Too Many Requests
            </h2>
            <p className="text-orange-600">
              Please wait a moment before trying again.
            </p>
          </div>
        );
      }
      return (
        <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-200 mt-8">
          <HugeiconsIcon
            icon={Alert02Icon}
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
          />
          <h2 className="text-xl font-bold text-gray-800 mb-2">System Error</h2>
          <p className="text-gray-600">
            An error occurred while verifying this certificate. Please try again
            later.
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

      let statusColor = "bg-green-100 text-green-800 border-green-200";
      let statusIcon = (
        <CheckmarkBadge01Icon className="w-6 h-6 text-green-600" />
      );
      let statusText = "Valid & Active";

      if (status === "expired") {
        statusColor = "bg-orange-100 text-orange-800 border-orange-200";
        statusIcon = <Alert02Icon className="w-6 h-6 text-orange-600" />;
        statusText = "Expired";
      } else if (status === "revoked") {
        statusColor = "bg-red-100 text-red-800 border-red-200";
        statusIcon = <Cancel01Icon className="w-6 h-6 text-red-600" />;
        statusText = "Revoked";
      }

      return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden mt-8">
          <div
            className={`p-6 flex items-center gap-4 border-b ${statusColor}`}
          >
            {statusIcon}
            <div>
              <h2 className="text-xl font-bold">{statusText}</h2>
              <p className="text-sm opacity-90">Certificate Status</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">
                  Learner Name
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {learner_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Module</p>
                <p className="text-lg font-bold text-gray-900">
                  {module_title}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">
                  Completion Date
                </p>
                <p className="text-gray-900">
                  {new Date(completion_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">
                  Expiration Date
                </p>
                <p className="text-gray-900">
                  {new Date(expires_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Certificate Verification
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Verify the authenticity and current status of a MDRRMO certificate.
          </p>
        </div>

        <form
          onSubmit={handleVerify}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <label
            htmlFor="token"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Verification Token (UUID)
          </label>
          <div className="flex gap-4">
            <input
              type="text"
              id="token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm"
            >
              Verify
            </button>
          </div>
        </form>

        {renderContent()}
      </div>
    </div>
  );
}
