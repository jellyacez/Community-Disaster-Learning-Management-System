import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import { authClient } from "../../lib/auth-client";
import PasswordInput from "../ui/inputs/PasswordInput";
import BarangayDropdown from "../ui/inputs/BarangayDropdown";
import TermsCheckbox from "../ui/inputs/TermsCheckbox";
import TermsModal from "../ui/modals/TermsModal";
import PrivacyModal from "../ui/modals/PrivacyModal";

export default function RegisterForm() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    barangay: "",
    password: "",
    confirmPassword: "",
  });

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = React.useCallback((e) => {
    const { name, value } = e.target;
    if (name === "barangay") {
       setFormData((prev) => ({ ...prev, [name]: value }));
    } else {
       setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setErrors((prev) => {
      if (prev[name]) {
        return { ...prev, [name]: null };
      }
      return prev;
    });
  }, []);

  const handleSetShowTermsModal = React.useCallback((val) => setShowTermsModal(val), []);
  const handleSetShowPrivacyModal = React.useCallback((val) => setShowPrivacyModal(val), []);
  const handleSetAcceptedTerms = React.useCallback((val) => setAcceptedTerms(val), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    let newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) newErrors.email = "Please enter a valid email address.";

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*_=+-/.]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password = "Must be 8+ characters and include an uppercase letter and a symbol.";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!formData.barangay) newErrors.barangay = "Please select a barangay.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await authClient.signUp.email({
      email: formData.email,
      password: formData.password,
      name: formData.fullName,
      barangay: formData.barangay,
    });
    
    setIsSubmitting(false);

    if (error) {
      console.error("Registration failed:", error);
      setErrors({ form: error.message || "Registration failed. Please try again." });
    } else {
      navigate("/verify-email-prompt", { state: { email: formData.email } });
    }
  };

  const getInputClass = (fieldName) => {
    const baseClass = "w-full px-4 py-3 rounded-xl border outline-none transition-colors";
    return `${baseClass} ${
      errors[fieldName]
        ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 text-red-900"
        : "border-gray-200 focus:ring-2 focus:ring-red-500"
    }`;
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="flex items-center justify-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100">
            <HugeiconsIcon aria-hidden="true" icon={Alert01Icon} className="w-5 h-5 flex-shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        <div>
          <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-1">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            name="fullName"
            autoComplete="name"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="e.g. Juan Dela Cruz"
            className={getInputClass("fullName")}
            required
          />
          {errors.fullName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.fullName}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Example@email.com"
            className={getInputClass("email")}
            required
          />
          {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>}
        </div>

        <BarangayDropdown 
          value={formData.barangay} 
          onChange={handleChange} 
          error={errors.barangay} 
        />

        <PasswordInput
          id="password"
          name="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="Min. 8 characters"
          autoComplete="new-password"
        />

        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          placeholder="Re-enter your password"
          autoComplete="new-password"
        />

        <TermsCheckbox 
          acceptedTerms={acceptedTerms}
          setAcceptedTerms={handleSetAcceptedTerms}
          setShowTermsModal={handleSetShowTermsModal}
          setShowPrivacyModal={handleSetShowPrivacyModal}
        />

        <button
          type="submit"
          disabled={!acceptedTerms || isSubmitting}
          className={`w-full py-3 rounded-xl font-bold transition-colors ${
            !acceptedTerms || isSubmitting
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Account...
            </span>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Already have an account?{" "}
        <Link to="/signin" className="text-red-600 font-semibold hover:underline">
          Sign In
        </Link>
      </p>

      <TermsModal isOpen={showTermsModal} onClose={() => handleSetShowTermsModal(false)} />
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => handleSetShowPrivacyModal(false)} />
    </>
  );
}
