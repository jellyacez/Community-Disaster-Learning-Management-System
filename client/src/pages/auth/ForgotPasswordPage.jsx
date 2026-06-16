import React, { useState } from "react";
import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Shield01Icon,
  ArrowLeft01Icon,
  Mail01Icon,
  CheckmarkBadge01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons";
import { authClient } from "../../lib/auth-client";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function ForgotPasswordPage() {
  useDocumentTitle('Forgot Password | Bacolor LMS');
  
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

    const { data, error } = await authClient.forgetPassword({
      email,
      redirectTo: "/reset-password",
    });

    if (error) {
      setErrorMsg(error.message || "Failed to send reset email.");
      setStatus("error");
    } else {
      setStatus("success");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-red-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <Link
          to="/signin"
          className="inline-flex items-center gap-2 text-sm text-red-600 font-semibold hover:underline mb-6"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
          Back to Sign In
        </Link>

        {status === "success" ? (
          <div className="text-center py-6">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">
              Check Your Email
            </h2>
            <p className="mt-3 text-sm text-gray-500">
              We've sent a password reset link to{" "}
              <span className="font-semibold text-gray-900">{email}</span>.
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
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center">
                <HugeiconsIcon
                  icon={Shield01Icon}
                  className="w-6 h-6 text-white"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Forgot Password
                </h1>
                <p className="text-sm text-gray-500">
                  Reset your account password
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {status === "error" && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100">
                  <HugeiconsIcon
                    icon={Alert01Icon}
                    className="w-5 h-5 flex-shrink-0"
                  />
                  <span>{errorMsg}</span>
                </div>
              )}

              <p className="text-sm text-gray-600 mb-4">
                Enter the email address associated with your account and we'll
                send you a link to reset your password.
              </p>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <HugeiconsIcon
                    icon={Mail01Icon}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  />
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
          </>
        )}
      </div>
    </div>
  );
}
