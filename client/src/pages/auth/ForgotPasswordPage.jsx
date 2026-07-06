// --- START: ForgotPasswordPage.jsx ---
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, CheckmarkBadge01Icon, Alert01Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import { authClient } from "../../lib/auth-client";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import AuthLayout from "../../components/layouts/AuthLayout";

export default function ForgotPasswordPage() {
  useDocumentTitle("Forgot Password | Bacolor LMS");
  
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your email address.");
      setStatus("error");
      return;
    }

    setStatus("loading");

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${import.meta.env.VITE_FRONTEND_URL || "http://localhost:5173"}/reset-password`,
    });

    if (error) {
      setErrorMsg(error.message || "Failed to send reset email.");
      setStatus("error");
    } else {
      setStatus("success");
    }
  };

  if (status === "success") {
    return (
      <AuthLayout title="Check Your Email" subtitle="" backLink="/signin" backText="Back to Sign In" icon={CheckmarkBadge01Icon}>
        <div className="text-center py-6 -mt-16">
          <p className="mt-3 text-sm text-gray-500">
            We've sent a password reset link to <span className="font-semibold text-gray-900">{email}</span>.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Didn't receive it? Check your spam folder or try again.
          </p>
          <button
            onClick={() => {
              setStatus("idle");
              setEmail("");
            }}
            className="mt-8 w-full rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200 transition"
          >
            Try another email
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot Password" subtitle="Reset your account password" backLink="/signin" backText="Back to Sign In" icon={Shield01Icon}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {status === "error" && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100">
            <HugeiconsIcon aria-hidden="true" icon={Alert01Icon} className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4">
          Enter the email address associated with your account and we'll
          send you a link to reset your password.
        </p>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <HugeiconsIcon aria-hidden="true" icon={Mail01Icon} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setStatus("idle");
              }}
              placeholder="Enter your email"
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className={`w-full mt-4 py-3 rounded-xl font-bold transition-colors ${
            status === "loading"
              ? "bg-red-400 text-white cursor-not-allowed"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {status === "loading" ? "Sending Link..." : "Send Reset Link"}
        </button>
      </form>
    </AuthLayout>
  );
}
// --- END: ForgotPasswordPage.jsx ---
