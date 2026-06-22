// --- START: VerifyEmail.jsx ---
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authClient } from "../../lib/auth-client";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon, Alert01Icon } from "@hugeicons/core-free-icons";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  const hasFired = useRef(false);

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        return;
      }

      if (hasFired.current) return;
      hasFired.current = true;

      try {
        const { data, error } = await authClient.verifyEmail({
          query: { token },
        });

        if (error) throw error;

        setStatus("success");
        setTimeout(() => navigate("/userDashboard"), 3000);
      } catch (err) {
        console.error("Verification failed:", err);
        setErrorMessage(err.message || err.error?.message || JSON.stringify(err) || "Unknown error");
        setStatus("error");
      }
    };

    verifyToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100">
        {status === "verifying" && (
          <div className="animate-pulse">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
            <h2 className="text-xl font-bold text-gray-900">
              Verifying your email...
            </h2>
            <p className="text-gray-500 mt-2">
              Please wait while we confirm your credentials.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="animate-in fade-in zoom-in duration-300">
            <HugeiconsIcon
              icon={CheckmarkBadge01Icon}
              className="w-16 h-16 mx-auto text-green-500 mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-900">
              Email Verified!
            </h2>
            <p className="text-gray-500 mt-2">
              Your account is now active. Redirecting you to the dashboard...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="animate-in fade-in zoom-in duration-300">
            <HugeiconsIcon
              icon={Alert01Icon}
              className="w-16 h-16 mx-auto text-red-500 mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-900">
              Verification Failed
            </h2>
            <p className="text-gray-500 mt-2">
              {errorMessage ? `Error: ${errorMessage}` : "The link may be expired or invalid."}
            </p>
            <button
              onClick={() => navigate("/signin")}
              className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
// --- END: VerifyEmail.jsx ---
