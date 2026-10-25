import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import { Turnstile } from "@marsidev/react-turnstile";
import toast from "react-hot-toast";
import { authClient } from "../../lib/auth-client";
import PasswordInput from "../ui/inputs/PasswordInput";
import Spinner from "../ui/Spinner";
import GoogleSignInButton from "./GoogleSignInButton";

const SECURITY_CHECK_TIMEOUT_MS = 10000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailSignInForm({ initialEmail = "", errorMessage, clearGlobalError, onRequireMfa, onSuccess }) {
  // Coming back from the code step keeps the email that was already typed
  const [formData, setFormData] = useState({ email: initialEmail, password: "" });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  // Fields are only checked on blur after the first submit, so tabbing past them stays quiet
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const isSubmittingRef = useRef(false);
  const turnstileRef = useRef(null);
  const emailRef = useRef(null);
  // Returning from the code step: the email is already there, so start in the password field
  useEffect(() => {
    if (initialEmail) document.getElementById("password")?.focus();
  }, [initialEmail]);

  // "loading" | "ready" | "failed": drives the message shown in place of the security widget
  const [securityStatus, setSecurityStatus] = useState("loading");
  // Bumping this remounts the widget, which also reloads Cloudflare's script if it never arrived
  const [securityAttempt, setSecurityAttempt] = useState(0);

  // A security check that never finishes counts as failed, so the user gets a retry instead of a wait
  useEffect(() => {
    if (securityStatus !== "loading") return;
    const timer = setTimeout(() => setSecurityStatus("failed"), SECURITY_CHECK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [securityStatus]);

  const retrySecurityCheck = () => {
    setSecurityStatus("loading");
    setErrors((prev) => ({ ...prev, turnstile: null }));
    setTurnstileToken("");
    // If Cloudflare's script never loaded, drop the dead tag so the remount fetches it again
    if (!window.turnstile) {
      document.querySelectorAll('script[src*="challenges.cloudflare.com/turnstile"]').forEach((tag) => tag.remove());
    }
    setSecurityAttempt((n) => n + 1);
    // The retry button disappears, so hand focus to Sign In rather than letting it fall to the page
    requestAnimationFrame(() => document.querySelector('form button[type="submit"]')?.focus());
  };

  const validateField = (name, value) => {
    let error = null;
    switch (name) {
      case "email":
        if (!value) error = "Email address is required.";
        else if (!EMAIL_PATTERN.test(value.trim())) error = "Enter a valid email address, like juan@gmail.com.";
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
        if (prevErrors.credentials) updatedErrors.credentials = false;
        
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
    if (!hasSubmitted) return;
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, [hasSubmitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    
    if (clearGlobalError) clearGlobalError();
    setErrors({});
    setHasSubmitted(true);
    
    let newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (!turnstileToken) {
      newErrors.turnstile = "Still running the security check. Try again in a moment.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Send focus to the first field that needs fixing
      if (newErrors.email) emailRef.current?.focus();
      else if (newErrors.password) document.getElementById("password")?.focus();
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);

    const { data, error } = await authClient.signIn.email({
      email: formData.email,
      password: formData.password,
      fetchOptions: {
        headers: {
          "x-turnstile-token": turnstileToken,
        },
      },
    });

    if (error) {
      if (import.meta.env.DEV) console.error("Sign in failed:", error);
      let errorMsg = "Invalid email or password. Please try again.";
      let isCredentialsError = true;
      const rawMsg = (error?.message || "").toLowerCase();

      if (error.code === "INVALID_EMAIL") {
        errorMsg = "That email address doesn't look right. Check it and try again.";
      } else if (error.status === 429 || rawMsg.includes("too many")) {
        errorMsg = "Too many login attempts. Please wait 15 minutes and try again.";
        toast.error(errorMsg);
      } else if (
        rawMsg.includes("not verified") ||
        rawMsg.includes("verify your email")
      ) {
        errorMsg = "Please verify your email address before signing in. Check your inbox!";
      } else if (error.status === 403 || rawMsg.includes("archived") || rawMsg.includes("banned")) {
        errorMsg = error.message;
      }

      if (error.code === "INVALID_EMAIL" || error.status === 429 || error.status === 403 || rawMsg.includes("verif")) {
        isCredentialsError = false;
      }
      // A wrong email or password can't be told apart, so both fields are marked
      setErrors({ form: errorMsg, credentials: isCredentialsError });

      // Reset Turnstile challenge on auth failure; a fresh token is needed before the next try
      turnstileRef.current?.reset();
      setTurnstileToken("");
      setSecurityStatus("loading");
      isSubmittingRef.current = false;
      setIsLoading(false);
    } else {
      isSubmittingRef.current = false;
      setIsLoading(false);
      
      if (data?.twoFactorRedirect) {
        onRequireMfa({ ...data, email: formData.email });
        return;
      }
      onSuccess(data);
    }
  };

  const getInputClass = (fieldName) => {
    const baseClass = "w-full px-4 py-3 rounded-xl border outline-none transition-colors";
    const hasError = errors[fieldName] || errors.credentials;
    return `${baseClass} ${
      hasError
        ? "border-red-600 focus:ring-2 focus:ring-red-600 bg-red-50 text-red-900"
        : "border-gray-500 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/50"
    }`;
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {errorMessage && !errors.form && (
        <div role="alert" className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100">
          <HugeiconsIcon aria-hidden="true" icon={Alert01Icon} className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {errors.form && (
        <div
          id="signin-error"
          role="alert"
          className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100"
        >
          <HugeiconsIcon aria-hidden="true" icon={Alert01Icon} className="w-5 h-5 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
          Email Address
        </label>
        <input
          ref={emailRef}
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          required
          aria-invalid={!!errors.email || !!errors.credentials}
          aria-describedby={errors.email ? "email-error" : errors.credentials ? "signin-error" : undefined}
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Enter email"
          className={`${getInputClass("email")} placeholder:text-gray-500`}
        />
        {errors.email && (
          <p id="email-error" className="text-red-700 text-xs mt-1 font-medium">{errors.email}</p>
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
          invalid={errors.credentials}
          describedBy={errors.credentials ? "signin-error" : undefined}
        />
        <div className="mt-1 text-right">
          <Link
            to="/forgot-password"
            className="inline-flex min-h-11 items-center text-gray-900 font-semibold underline underline-offset-4 hover:text-gray-600 text-sm cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            Forgot Password?
          </Link>
        </div>
      </div>

      {/* Cloudflare Turnstile: only appears when it needs the person to interact */}
      <div className="flex flex-col items-center justify-center">
        <Turnstile
          key={securityAttempt}
          ref={turnstileRef}
          siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
          options={{ appearance: "interaction-only" }}
          onSuccess={(token) => {
            setTurnstileToken(token);
            setSecurityStatus("ready");
            setErrors((prev) => ({ ...prev, turnstile: null }));
          }}
          onError={() => {
            setTurnstileToken("");
            setSecurityStatus("failed");
          }}
          onTimeout={() => {
            setTurnstileToken("");
            setSecurityStatus("failed");
          }}
          onUnsupported={() => setSecurityStatus("failed")}
          onExpire={() => {
            setTurnstileToken("");
            setSecurityStatus("loading");
          }}
        />
        {/* Always mounted so screen readers hear the status as it changes */}
        <div id="security-check-status" aria-live="polite" className="flex flex-col items-center text-center text-xs">
          {securityStatus === "loading" && !errors.turnstile && (
            <p className="text-gray-600">Running a quick security check before you can sign in…</p>
          )}
          {securityStatus === "failed" && (
            <>
              <p className="font-medium text-red-700">Security check couldn&apos;t load. Check your connection.</p>
              <button
                type="button"
                onClick={retrySecurityCheck}
                className="mt-1 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-gray-900 underline underline-offset-4 outline-none hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-gray-900"
              >
                Try the security check again
              </button>
            </>
          )}
          {errors.turnstile && securityStatus !== "failed" && (
            <p className="font-medium text-red-700">{errors.turnstile}</p>
          )}
        </div>
      </div>

      {/* Stays focusable while busy so keyboard and screen-reader users keep their place */}
      <button
        type="submit"
        aria-disabled={isLoading || !turnstileToken}
        aria-busy={isLoading}
        aria-describedby={!turnstileToken ? "security-check-status" : undefined}
        className="w-full min-h-12 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors aria-disabled:bg-gray-300 aria-disabled:text-gray-800 aria-disabled:hover:bg-gray-300 aria-disabled:cursor-not-allowed flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
      >
        {isLoading ? <><Spinner /> Signing In...</> : "Sign In"}
      </button>

      <GoogleSignInButton clearGlobalError={clearGlobalError} />
    </form>
  );
}