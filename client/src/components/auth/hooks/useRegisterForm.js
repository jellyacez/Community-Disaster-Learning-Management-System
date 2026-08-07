import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "../../../lib/auth-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";
import { VALID_BARANGAY_NAMES } from "../../../constants/barangays";
export const useRegisterForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    barangay: "",
    password: "",
    confirmPassword: "",
  });

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const { data: barangays = [] } = useQuery({
    queryKey: ["barangays"],
    queryFn: async () => {
      const res = await apiClient.get("/public/barangays");
      return res.data;
    },
  });

  const validateField = useCallback(
    (name, value, currentFormData = formData) => {
      let error = null;
      switch (name) {
        case "fullName":
          if (!value.trim()) error = "Full name is required.";
          break;
        case "email": {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value))
            error = "Please enter a valid email address.";
          break;
        }
        case "password": {
          const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*_=+\-/.]).{8,}$/;
          if (!passwordRegex.test(value)) {
            error =
              "Must be 8+ characters and include an uppercase letter and a symbol.";
          }
          break;
        }
        case "confirmPassword":
          if (value !== currentFormData.password) {
            error = "Passwords do not match.";
          }
          break;
        case "barangay":
          if (!value) {
            error = "Please select a barangay.";
          } else if (!VALID_BARANGAY_NAMES.includes(value.trim())) {
            error = "Plea  se select a valid barangay from the list.";
          }
          break;
      }
      return error;
    },
    [formData],
  );

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormData((prev) => {
        const newData = { ...prev, [name]: value };

        // If there's already an error, run live validation so it clears immediately when fixed
        setErrors((prevErrors) => {
          if (prevErrors[name]) {
            const newError = validateField(name, value, newData);
            return { ...prevErrors, [name]: newError };
          }
          return prevErrors;
        });

        return newData;
      });
    },
    [validateField],
  );

  const handleBlur = useCallback(
    (e) => {
      const { name, value } = e.target;
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [validateField],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    setErrors({});

    let newErrors = {};

    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Instead of calling the API, we intercept and show the Explicit Consent Modal
    setShowConsentModal(true);
  };

  const confirmRegistration = async () => {
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const selectedBarangay = barangays.find(
      (b) => b.name === formData.barangay,
    );

    const { error } = await authClient.signUp.email({
      email: formData.email,
      password: formData.password,
      name: formData.fullName,
      barangay_id: selectedBarangay?.id,
    });

    if (error) {
      console.error("Registration failed:", error);
      setErrors({
        form: error.message || "Registration failed. Please try again.",
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setShowConsentModal(false);
    } else {
      // Clear specific cached queries to prevent stale data (like userDashboard from a previous test user)
      // from appearing on the profile page right after registration.
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["userDashboard"] });

      // Flag for UserDashboard: show WelcomeModal on first login after registration.
      // sessionStorage is cleared when the browser tab closes, so it only fires once per session.
      sessionStorage.setItem("newlyRegistered", "true");

      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setShowConsentModal(false);
      navigate("/verify-email-prompt", { state: { email: formData.email } });
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
};
