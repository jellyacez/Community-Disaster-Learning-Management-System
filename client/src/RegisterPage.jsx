import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { authClient } from "./lib/auth-client";

const BACOLOR_BARANGAYS = [
  "Balas",
  "Cabalantian",
  "Cabambangan",
  "Cabetican",
  "Calibutbut",
  "Concepcion",
  "Dolores",
  "Duat",
  "Macabacle",
  "Magliman",
  "Maliwalu",
  "Mesalipit",
  "Parulog",
  "Potrero",
  "San Antonio",
  "San Isidro",
  "San Vicente",
  "Santa Barbara",
  "Santa Ines",
  "Talba",
  "Tinajero",
];

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    barangay: "",
    password: "",
    confirmPassword: "",
  });

  const [showBarangayList, setShowBarangayList] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [formSuccess, setFormSuccess] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setFormSuccess("");

    let newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*_=+-/.]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password =
        "Must be 8+ characters and include an uppercase letter and a symbol.";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!formData.barangay) {
      newErrors.barangay = "Please select a barangay.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const { data, error } = await authClient.signUp.email({
      email: formData.email,
      password: formData.password,
      name: formData.fullName,
      barangay: formData.barangay,
    });

    if (error) {
      console.error("Registration failed:", error);
      setErrors({
        form: error.message || "Registration failed. Please try again.",
      });
    } else {
      console.log("Registration successful:", data);
      setFormSuccess("Account created successfully! Redirecting...");
      setTimeout(() => navigate("/signin"), 1500);
    }
  };

  const getInputClass = (fieldName) => {
    const baseClass =
      "w-full px-4 py-3 rounded-xl border outline-none transition-colors";
    return `${baseClass} ${
      errors[fieldName]
        ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 text-red-900"
        : "border-gray-200 focus:ring-2 focus:ring-red-500"
    }`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-red-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-red-600 font-semibold hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Landing Page
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create Account</h1>
            <p className="text-sm text-gray-500">
              Register to access the DRRM portal
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="text-red-600 text-sm font-semibold text-center mb-4">
              {errors.form}
            </div>
          )}
          {formSuccess && (
            <div className="text-green-600 text-sm font-semibold text-center mb-4">
              {formSuccess}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Juan Dela Cruz"
              className={getInputClass("fullName")}
              required
            />
            {errors.fullName && (
              <p className="text-red-500 text-xs mt-1 font-medium">
                {errors.fullName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Example@email.com"
              className={getInputClass("email")}
              required
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1 font-medium">
                {errors.email}
              </p>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Barangay
            </label>
            <input
              type="text"
              name="barangay"
              value={formData.barangay}
              onChange={(e) => {
                handleChange(e);
                setShowBarangayList(true);
              }}
              onFocus={() => setShowBarangayList(true)}
              onBlur={() => setTimeout(() => setShowBarangayList(false), 200)}
              placeholder="Search or select barangay"
              className={getInputClass("barangay")}
              required
              autoComplete="off"
            />
            {errors.barangay && (
              <p className="text-red-500 text-xs mt-1 font-medium">
                {errors.barangay}
              </p>
            )}

            {showBarangayList && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg">
                {BACOLOR_BARANGAYS.filter((b) =>
                  b.toLowerCase().includes(formData.barangay.toLowerCase()),
                ).length > 0 ? (
                  BACOLOR_BARANGAYS.filter((b) =>
                    b.toLowerCase().includes(formData.barangay.toLowerCase()),
                  ).map((b) => (
                    <li
                      key={b}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, barangay: b }));
                        setErrors((prev) => ({ ...prev, barangay: null }));
                        setShowBarangayList(false);
                      }}
                      className="px-4 py-2 hover:bg-red-50 cursor-pointer text-gray-700 text-sm"
                    >
                      {b}
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-2 text-gray-500 text-sm">
                    No results found
                  </li>
                )}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                className={`${getInputClass("password")} pr-12`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1 font-medium">
                {errors.password}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                className={`${getInputClass("confirmPassword")} pr-12`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1 font-medium">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
          >
            Register
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Already have an account?{" "}
          <Link
            to="/signin"
            className="text-red-600 font-semibold hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
