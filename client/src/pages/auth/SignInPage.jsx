import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Shield01Icon,
  ArrowLeft01Icon,
  EyeIcon,
  EyeOffIcon,
  Alert01Icon,
} from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import { authClient } from "../../lib/auth-client";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function SignInPage() {
  useDocumentTitle('Sign In | Bacolor LMS');
  
  const navigate = useNavigate();
  const location = useLocation();
  const errorMessage = location.state?.error;

  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (sessionStorage.getItem("isLoggingOut") === "true") {
      if (!session && !isPending) {
        sessionStorage.removeItem("isLoggingOut");
      }
      return;
    }

    if (session && !isPending) {
      const userRole = session.user?.role;
      if (userRole === "system_admin")
        navigate("/admin/dashboard", { replace: true });
      else if (userRole === "mdrrmo_admin")
        navigate("/mdrrmo/dashboard", { replace: true });
      else if (userRole === "barangay_admin")
        navigate("/barangay/dashboard", { replace: true });
      else navigate("/userDashboard", { replace: true });
    }
  }, [session, isPending, navigate]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errors[e.target.name] || errors.form) {
      setErrors((prev) => ({ ...prev, [e.target.name]: null, form: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    let newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email address is required.";
    }

    if (!formData.password) {
      newErrors.password = "Password is required.";
    }

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
      setErrors({
        form: error.message || "Invalid email or password. Please try again.",
      });
    } else {
      console.log("Sign in successful:", data);
      toast.success("Successfully logged in!");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-red-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-red-600 font-semibold hover:underline mb-6 outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-md px-1 -ml-1"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
          Back to Landing Page
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center">
            <HugeiconsIcon icon={Shield01Icon} className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sign In</h1>
            <p className="text-sm text-gray-500">
              Access your DRRM training account
            </p>
          </div>
        </div>

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
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                className={`${getInputClass("password")} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <HugeiconsIcon icon={EyeOffIcon} className="w-5 h-5" />
                ) : (
                  <HugeiconsIcon icon={EyeIcon} className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1 font-medium">
                {errors.password}
              </p>
            )}
            {/* add link to forgot password page */}
            <Link to="/forgot-password" className="block text-red-600 font-semibold hover:underline text-sm mt-3 cursor-pointer text-right">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
          >
            Sign In
          </button>
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
      </div>
    </div>
  );
}
