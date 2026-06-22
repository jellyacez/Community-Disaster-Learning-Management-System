import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import { authClient } from "../../lib/auth-client";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import AuthLayout from "../../components/auth/AuthLayout";
import PasswordInput from "../../components/ui/inputs/PasswordInput";
import ConfirmationModal from "../../components/ui/modals/ConfirmationModal";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton";

export default function SignInPage() {
  useDocumentTitle("Sign In | Bacolor LMS");

  const navigate = useNavigate();
  const location = useLocation();
  const errorMessage = location.state?.error;

  const { data: session, isPending } = authClient.useSession();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("showLogoutModal") === "true") {
      setShowLogoutModal(true);
      sessionStorage.removeItem("showLogoutModal");
    }

    if (sessionStorage.getItem("isLoggingOut") === "true") {
      if (!session && !isPending) {
        sessionStorage.removeItem("isLoggingOut");
      }
      return;
    }

    if (session && !isPending) {
      const userRole = session.user?.role;
      const isAdmin = ["system_admin", "mdrrmo_admin", "barangay_admin"].includes(userRole);

      if (isAdmin && !session.user.twoFactorEnabled) {
        navigate("/admin/mfa-setup", { replace: true });
        return;
      }

      if (userRole === "system_admin")
        navigate("/admin/dashboard", { replace: true });
      else if (userRole === "mdrrmo_admin")
        navigate("/mdrrmo/dashboard", { replace: true });
      else if (userRole === "barangay_admin")
        navigate("/barangay/dashboard", { replace: true });
      else navigate("/userDashboard", { replace: true });
    }
  }, [session, isPending, navigate]);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name] || errors.form) {
      setErrors((prev) => ({ ...prev, [e.target.name]: null, form: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    let newErrors = {};
    if (!formData.email) newErrors.email = "Email address is required.";
    if (!formData.password) newErrors.password = "Password is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const { data, error } = await authClient.signIn.email({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      console.error("Sign in failed:", error);
      let errorMessage =
        error.message || "Invalid email or password. Please try again.";

      if (
        error.status === 429 ||
        errorMessage.toLowerCase().includes("too many")
      ) {
        errorMessage =
          "Too many login attempts. Please wait 15 minutes and try again.";
        toast.error(errorMessage);
      } else if (
        errorMessage.toLowerCase().includes("not verified") ||
        errorMessage.toLowerCase().includes("verify your email")
      ) {
        errorMessage =
          "Please verify your email address before signing in. Check your inbox!";
      }

      setErrors({ form: errorMessage });
    } else {
      if (data?.twoFactorRedirect) {
        setShowTwoFactor(true);
        return;
      }
      console.log("Sign in successful:", data);
      toast.success("Successfully logged in!");
    }
  };

  const handleVerifyTotp = async (e) => {
    e.preventDefault();
    setErrors({});
    const { error } = await authClient.twoFactor.verifyTotp({
      code: totpCode,
    });

    if (error) {
      setErrors({ form: "Invalid Authenticator Code. Please try again." });
    } else {
      toast.success("Successfully logged in!");
      window.location.reload();
    }
  };

  const getInputClass = (fieldName) => {
    const baseClass =
      "w-full px-4 py-3 rounded-xl border outline-none transition-colors";
    const hasError = errors[fieldName] || errors.form;
    return `${baseClass} ${
      hasError
        ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 text-red-900"
        : "border-gray-200 focus:ring-2 focus:ring-red-500"
    }`;
  };

  if (showTwoFactor) {
    return (
      <AuthLayout title="Two-Factor Authentication" subtitle="Enter the code from your authenticator app">
        <form onSubmit={handleVerifyTotp} className="space-y-4">
          {errors.form && (
            <div className="flex items-center justify-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100">
              <HugeiconsIcon icon={Alert01Icon} className="w-5 h-5 flex-shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Authenticator Code
            </label>
            <input
              type="text"
              value={totpCode}
              onChange={(e) => {
                setTotpCode(e.target.value);
                setErrors({});
              }}
              placeholder="000000"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none transition text-center tracking-[0.5em] text-lg font-bold"
              maxLength={6}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
          >
            Verify Code
          </button>
          <button
            type="button"
            onClick={() => setShowTwoFactor(false)}
            className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors mt-2"
          >
            Cancel
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Sign In" subtitle="Access your DRRM training account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && !errors.form && (
          <div className="flex items-center justify-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100">
            <HugeiconsIcon
              icon={Alert01Icon}
              className="w-5 h-5 flex-shrink-0"
            />
            <span>{errorMessage}</span>
          </div>
        )}

        {errors.form && (
          <div className="flex items-center justify-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100">
            <HugeiconsIcon
              icon={Alert01Icon}
              className="w-5 h-5 flex-shrink-0"
            />
            <span>{errors.form}</span>
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            className={getInputClass("email")}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1 font-medium">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <PasswordInput
            id="password"
            name="password"
            label="Password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
          />
          <Link
            to="/forgot-password"
            className="block text-red-600 font-semibold hover:underline text-sm mt-3 cursor-pointer text-right"
          >
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
        >
          Sign In
        </button>

        <GoogleSignInButton />
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="text-red-600 font-semibold hover:underline"
        >
          Register
        </Link>
      </p>

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => setShowLogoutModal(false)}
        title="You have been logged out."
        description="You have been logged out from another device. If this wasn't you, we recommend changing your password immediately to secure your account."
        type="success"
        confirmText="Okay"
        cancelText="Close"
      />
    </AuthLayout>
  );
}
