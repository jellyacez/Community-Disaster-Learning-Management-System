import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import { authClient } from "../../lib/auth-client";
import PasswordInput from "../ui/inputs/PasswordInput";
import Spinner from "../ui/Spinner";
import GoogleSignInButton from "./GoogleSignInButton";

export default function EmailSignInForm({ errorMessage, clearGlobalError, onRequireMfa, onSuccess }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const validateField = (name, value) => {
    let error = null;
    switch (name) {
      case "email":
        if (!value) error = "Email address is required.";
        break;
      case "password":
        if (!value) error = "Password is required.";
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      
      setErrors((prevErrors) => {
        let updatedErrors = { ...prevErrors };
        if (prevErrors.form) updatedErrors.form = null;
        
        if (prevErrors[name]) {
          const newError = validateField(name, value);
          updatedErrors[name] = newError;
        }
        return updatedErrors;
      });

      return newData;
    });
    
    if (clearGlobalError) clearGlobalError();
  }, [clearGlobalError]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    
    if (clearGlobalError) clearGlobalError();
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

    isSubmittingRef.current = true;
    setIsLoading(true);
    const { data, error } = await authClient.signIn.email({
      email: formData.email,
      password: formData.password,
    });
    if (error) {
      console.error("Sign in failed:", error);
      let errorMsg = "Invalid email or password. Please try again.";
      const rawMsg = (error?.message || "").toLowerCase();

      if (error.status === 429 || rawMsg.includes("too many")) {
        errorMsg = "Too many login attempts. Please wait 15 minutes and try again.";
        toast.error(errorMsg);
      } else if (
        rawMsg.includes("not verified") ||
        rawMsg.includes("verify your email")
      ) {
        errorMsg = "Please verify your email address before signing in. Check your inbox!";
      }

      setErrors({ form: errorMsg });

      setTimeout(() => {
        isSubmittingRef.current = false;
        setIsLoading(false);
      }, 1500);
    } else {
      isSubmittingRef.current = false;
      setIsLoading(false);
      
      if (data?.twoFactorRedirect) {
        onRequireMfa(data);
        return;
      }
      onSuccess(data);
    }
  };

  const getInputClass = (fieldName) => {
    const baseClass = "w-full px-4 py-3 rounded-xl border outline-none transition-colors";
    const hasError = errors[fieldName] || errors.form;
    return `${baseClass} ${
      hasError
        ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 text-red-900"
        : "border-gray-200 focus:ring-2 focus:ring-red-500"
    }`;
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {errorMessage && !errors.form && (
        <div className="flex items-center justify-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100">
          <HugeiconsIcon aria-hidden="true" icon={Alert01Icon} className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {errors.form && (
        <div className="flex items-center justify-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100">
          <HugeiconsIcon aria-hidden="true" icon={Alert01Icon} className="w-5 h-5 flex-shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

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
          onBlur={handleBlur}
          placeholder="Enter email"
          className={getInputClass("email")}
        />
        {errors.email && (
          <p className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>
        )}
      </div>

      <div>
        <PasswordInput
          id="password"
          name="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
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
        disabled={isLoading}
        className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? <><Spinner /> Signing In...</> : "Sign In"}
      </button>

      <GoogleSignInButton clearGlobalError={clearGlobalError} />
    </form>
  );
}
