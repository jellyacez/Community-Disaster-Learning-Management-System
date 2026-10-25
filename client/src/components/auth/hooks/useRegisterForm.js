import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authClient } from "../../../lib/auth-client";
import { meetsPasswordRules } from "../../../constants/passwordRules";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Order the fields appear in, so focus goes to the first one that needs fixing
const FIELD_ORDER = ["fullName", "email", "barangay", "password", "confirmPassword"];

const validateField = (name, value, allData) => {
  let error = null;
  switch (name) {
    case "fullName":
      if (!value.trim()) error = "Enter your full name.";
      break;
    case "email":
      if (!value.trim()) error = "Enter your email address.";
      else if (!EMAIL_PATTERN.test(value.trim())) error = "Enter a valid email address, like juan@gmail.com.";
      break;
    case "barangay":
      // The barangay field only hands over a name picked from the list
      if (!value) error = "Choose your barangay from the list.";
      break;
    case "password":
      if (!value) error = "Enter a password.";
      else if (!meetsPasswordRules(value)) error = "Your password needs to meet all 3 rules below.";
      break;
    case "confirmPassword":
      if (!value) error = "Re-enter your password.";
      else if (value !== allData.password) error = "The passwords don't match.";
      break;
    default:
      break;
  }
  return error;
};

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
  // Fields are only checked on blur after the first submit, so tabbing past them stays quiet
  const [hasSubmitted, setHasSubmitted] = useState(false);
  // The field to focus once the errors from a submit have rendered
  const focusTargetRef = useRef(null);
  const setFocusTarget = (id) => {
    focusTargetRef.current = id;
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Runs after the consent dialog has handed focus back, so this placement wins
  useEffect(() => {
    if (!focusTargetRef.current) return;
    document.getElementById(focusTargetRef.current)?.focus();
    focusTargetRef.current = null;
  }, [errors]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      setErrors((prevErrors) => {
        const nextErrors = { ...prevErrors };
        if (nextErrors.form) nextErrors.form = null;
        if (name === "email" && nextErrors.emailTaken) nextErrors.emailTaken = false;
        if (nextErrors[name]) nextErrors[name] = validateField(name, value, next);
        // Changing the password can fix or break the confirmation
        if (name === "password" && nextErrors.confirmPassword) {
          nextErrors.confirmPassword = validateField("confirmPassword", next.confirmPassword, next);
        }
        return nextErrors;
      });
      return next;
    });
  }, []);

  const handleBlur = useCallback(
    (e) => {
      if (!hasSubmitted) return;
      const { name, value } = e.target;
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value, formData) }));
    },
    [hasSubmitted, formData],
  );

  // Returns early without opening the consent step when a field needs fixing or the security check isn't done
  const handleSubmit = (e, { securityReady = true } = {}) => {
    if (e) e.preventDefault();
    setHasSubmitted(true);

    const newErrors = {};
    FIELD_ORDER.forEach((key) => {
      const error = validateField(key, formData[key], formData);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);

    const firstInvalid = FIELD_ORDER.find((key) => newErrors[key]);
    if (firstInvalid) {
      setFocusTarget(firstInvalid);
      return;
    }
    if (!securityReady) return;

    setShowConsentModal(true);
  };

  const confirmRegistration = async () => {
    if (!turnstileToken) {
      setErrors({ form: "Wait for the security check to finish, then try again." });
      setShowConsentModal(false);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await authClient.signUp.email({
        email: formData.email.trim(),
        password: formData.password,
        name: formData.fullName.trim(),
        barangay: formData.barangay,
        fetchOptions: {
          headers: {
            "x-turnstile-token": turnstileToken,
          },
        },
      });

      if (error) {
        if (import.meta.env.DEV) console.error("Registration failed:", error);

        if (error.code === "USER_ALREADY_EXISTS") {
          // Only the email is wrong; the banner offers Sign In and Reset password
          setErrors({ form: "An account with this email already exists.", emailTaken: true });
          setFocusTarget("email");
        } else if (error.code === "INVALID_BARANGAY") {
          setErrors({ barangay: "Choose your barangay from the list." });
          setFocusTarget("barangay");
        } else if (error.code === "WEAK_PASSWORD") {
          setErrors({ password: "Your password needs to meet all 3 rules below." });
          setFocusTarget("password");
        } else if (error.status === 429) {
          setErrors({ form: "Too many attempts. Wait 15 minutes, then try again." });
        } else if (error.status === 403 || error.error === "CAPTCHA_FAILED") {
          setErrors({ form: "The security check didn't pass. Wait for it to finish again, then try." });
        } else {
          setErrors({ form: "We couldn't create your account. Check your connection and try again." });
        }

        onResetTurnstile?.();
        setShowConsentModal(false);
      } else {
        toast.success("Account created. Check your email to verify it.");
        setShowConsentModal(false);
        navigate("/verify-email-prompt", {
          state: { email: formData.email.trim() },
          replace: true,
        });
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Registration exception:", err);
      setErrors({ form: "We couldn't create your account. Check your connection and try again." });
      onResetTurnstile?.();
      setShowConsentModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInputClass = (fieldName) => {
    const baseClass = "w-full px-4 py-3 rounded-xl border outline-none transition-colors placeholder:text-gray-500";
    const hasError = errors[fieldName] || (fieldName === "email" && errors.emailTaken);
    return `${baseClass} ${
      hasError
        ? "border-red-600 focus:ring-2 focus:ring-red-600 bg-red-50 text-red-900"
        : "border-gray-500 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/50"
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
