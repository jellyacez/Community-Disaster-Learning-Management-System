// --- START: ResetPasswordPage.jsx ---
import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import { authClient } from "../../lib/auth-client";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import toast from "react-hot-toast";
import AuthLayout from "../../components/layouts/AuthLayout";
import PasswordInput from "../../components/ui/inputs/PasswordInput";

export default function ResetPasswordPage() {
  useDocumentTitle("Reset Password | Bacolor LMS");
  
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ newPassword: "", confirmPassword: "" });
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMsg) setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg("Invalid or missing reset token.");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*_=+-/.]).{8,}$/;
    if (!passwordRegex.test(formData.newPassword)) {
      setErrorMsg("Must be 8+ characters and include an uppercase letter and a symbol.");
      return;
    }

    setStatus("loading");

    const { data, error } = await authClient.resetPassword({
      newPassword: formData.newPassword,
      token,
    });

    if (error) {
      setErrorMsg(error.message || "Failed to reset password. The link might be expired.");
      setStatus("error");
    } else {
      toast.success("Password reset successful. Please log in with your new credentials.", { duration: 5000 });
      navigate("/signin", { replace: true });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-red-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <HugeiconsIcon aria-hidden="true" icon={Alert01Icon} className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Invalid Link</h2>
          <p className="mt-3 text-sm text-gray-500">
            This password reset link is invalid or missing a token. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="mt-8 block w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout title="New Password" subtitle="Secure your account" backLink="/signin" backText="Back to Sign In" icon={Shield01Icon}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100">
            <HugeiconsIcon aria-hidden="true" icon={Alert01Icon} className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <PasswordInput
          id="newPassword"
          name="newPassword"
          label="New Password"
          value={formData.newPassword}
          onChange={handleChange}
          placeholder="Min. 8 characters"
        />

        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm New Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Re-enter your password"
        />

        <button
          type="submit"
          disabled={status === "loading"}
          className={`w-full mt-4 py-3 rounded-xl font-bold transition-colors ${
            status === "loading"
              ? "bg-red-400 text-white cursor-not-allowed"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {status === "loading" ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </AuthLayout>
  );
}
// --- END: ResetPasswordPage.jsx ---
