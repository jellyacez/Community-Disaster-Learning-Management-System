import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authClient } from "../../../lib/auth-client";

export function useRegisterForm({ turnstileToken, onResetTurnstile } = {}) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    barangay: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const validateField = (name, value, allData = formData) => {
    let error = null;
    switch (name) {
      case "fullName":
        if (!value.trim()) error = "Full name is required.";
        break;
      case "email":
        if (!value.trim()) error = "Email address is required.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          error = "Invalid email address format.";
        break;
      case "barangay":
        if (!value) error = "Please select a barangay.";
        break;
      case "password":
        if (!value) error = "Password is required.";
        else if (value.length < 8)
          error = "Password must be at least 8 characters.";
        break;
      case "confirmPassword":
        if (!value) error = "Please confirm your password.";
        else if (value !== allData.password) error = "Passwords do not match.";
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      setErrors((prevErrors) => {
        const nextErrors = { ...prevErrors };
        if (nextErrors.form) nextErrors.form = null;
        if (nextErrors[name]) {
          nextErrors[name] = validateField(name, value, next);
        }
        return nextErrors;
      });
      return next;
    });
  }, []);

  const handleBlur = useCallback(
    (e) => {
      const { name, value } = e.target;
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [formData],
  );

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setErrors({});

    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setShowConsentModal(true);
  };

  const confirmRegistration = async () => {
    if (!turnstileToken) {
      setErrors({ form: "Please complete the security challenge." });
      setShowConsentModal(false);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.fullName,
        barangay: formData.barangay,
        fetchOptions: {
          headers: {
            "x-turnstile-token": turnstileToken,
          },
        },
      });

      if (error) {
        console.error("Registration failed:", error);
        setErrors({
          form: error.message || "Registration failed. Please try again.",
        });
        onResetTurnstile?.();
        setShowConsentModal(false);
      } else {
        toast.success(
          "Account created successfully! Please verify your email.",
        );
        setShowConsentModal(false);
        navigate("/verify-email-prompt", {
          state: { email: formData.email },
          replace: true,
        });
      }
    } catch (err) {
      console.error("Registration exception:", err);
      setErrors({
        form: "An unexpected error occurred. Please try again later.",
      });
      onResetTurnstile?.();
      setShowConsentModal(false);
    } finally {
      setIsSubmitting(false);
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

  return {
    state: {
      formData,
      errors,
      isSubmitting,
      showTermsModal,
      showPrivacyModal,
      showConsentModal,
    },
    actions: {
      handleChange,
      handleBlur,
      handleSubmit,
      confirmRegistration,
      getInputClass,
      setShowTermsModal,
      setShowPrivacyModal,
      setShowConsentModal,
    },
  };
}
