import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "../../../lib/auth-client";

export const useRegisterForm = () => {
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
  const isSubmittingRef = useRef(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (prev[name]) {
        return { ...prev, [name]: null };
      }
      return prev;
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    
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

    if (!acceptedTerms) {
      setErrors({ form: "You must accept the terms and conditions." });
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const { error } = await authClient.signUp.email({
      email: formData.email,
      password: formData.password,
      name: formData.fullName,
      barangay: formData.barangay,
    });
    
    if (error) {
      console.error("Registration failed:", error);
      setErrors({ form: error.message || "Registration failed. Please try again." });
      
      await new Promise((resolve) => setTimeout(resolve, 1500));
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    } else {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
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

  return {
    state: {
      formData,
      errors,
      isSubmitting,
      showTermsModal,
      showPrivacyModal,
      acceptedTerms
    },
    actions: {
      handleChange,
      handleSubmit,
      getInputClass,
      setShowTermsModal,
      setShowPrivacyModal,
      setAcceptedTerms
    }
  };
};
