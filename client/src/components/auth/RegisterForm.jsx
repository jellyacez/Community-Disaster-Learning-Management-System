import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import { Turnstile } from "@marsidev/react-turnstile";
import PasswordInput from "../ui/inputs/PasswordInput";
import BarangayDropdown from "../ui/inputs/BarangayDropdown";
import TermsModal from "../ui/modals/TermsModal";
import PrivacyModal from "../ui/modals/PrivacyModal";
import ExplicitConsentModal from "../ui/modals/ExplicitConsentModal";
import Spinner from "../ui/Spinner";
import { useRegisterForm } from "./hooks/useRegisterForm";
import PasswordRequirements from "./PasswordRequirements";

const SECURITY_CHECK_TIMEOUT_MS = 10000;
const LINK_CLASS =
  "inline-flex min-h-11 items-center font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gray-900";
// Links inside a sentence: an invisible ::after widens the tap area to 44px without stretching the line height
const INLINE_LINK_CLASS =
  "relative after:absolute after:inset-x-0 after:-inset-y-3 font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-gray-900";

export default function RegisterForm() {
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState("");
  const turnstileRef = useRef(null);
  // "loading" | "ready" | "failed": drives the message shown in place of the security widget
  const [securityStatus, setSecurityStatus] = useState("loading");
  // Bumping this remounts the widget, which also reloads Cloudflare's script if it never arrived
  const [securityAttempt, setSecurityAttempt] = useState(0);

  // A security check that never finishes counts as failed, so the user gets a retry instead of a wait
  useEffect(() => {
    if (securityStatus !== "loading") return;
    const timer = setTimeout(
      () => setSecurityStatus("failed"),
      SECURITY_CHECK_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [securityStatus]);

  const resetTurnstile = () => {
    turnstileRef.current?.reset();
    setTurnstileToken("");
    setSecurityStatus("loading");
  };

  const retrySecurityCheck = () => {
    setSecurityStatus("loading");
    setTurnstileError("");
    setTurnstileToken("");
    // If Cloudflare's script never loaded, drop the dead tag so the remount fetches it again
    if (!window.turnstile) {
      document
        .querySelectorAll('script[src*="challenges.cloudflare.com/turnstile"]')
        .forEach((tag) => tag.remove());
    }
    setSecurityAttempt((n) => n + 1);
    // The retry button disappears, so hand focus to Create Account rather than letting it fall to the page
    requestAnimationFrame(() =>
      document.getElementById("register-submit")?.focus(),
    );
  };

  const { state, actions } = useRegisterForm({
    turnstileToken,
    onResetTurnstile: resetTurnstile,
  });

  const {
    formData,
    errors,
    isSubmitting,
    showTermsModal,
    showPrivacyModal,
    showConsentModal,
  } = state;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setTurnstileError(
      turnstileToken
        ? ""
        : "Still running the security check. Try again in a moment.",
    );
    actions.handleSubmit(e, { securityReady: !!turnstileToken });
  };

  return (
    <>
      <form onSubmit={handleFormSubmit} noValidate className="space-y-4">
        {errors.form && (
          <div
            id="register-error"
            role="alert"
            className="flex items-start gap-2 bg-red-50 text-red-700 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100"
          >
            <HugeiconsIcon
              aria-hidden="true"
              icon={Alert01Icon}
              className="w-5 h-5 shrink-0"
            />
            <div>
              <p>{errors.form}</p>
              {errors.emailTaken && (
                <p className="mt-1 font-medium text-gray-900">
                  <Link to="/signin" className={INLINE_LINK_CLASS}>
                    Sign in
                  </Link>
                  {" or "}
                  <Link to="/forgot-password" className={INLINE_LINK_CLASS}>
                    reset your password
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            name="fullName"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            value={formData.fullName}
            onChange={actions.handleChange}
            onBlur={actions.handleBlur}
            placeholder="e.g. Juan Dela Cruz"
            className={actions.getInputClass("fullName")}
            required
          />
          {errors.fullName && (
            <p
              id="fullName-error"
              className="text-red-700 text-xs mt-1 font-medium"
            >
              {errors.fullName}
            </p>
          )}
        </div>

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
            aria-invalid={!!errors.email || !!errors.emailTaken}
            aria-describedby={
              errors.email
                ? "email-error"
                : errors.emailTaken
                  ? "register-error"
                  : undefined
            }
            value={formData.email}
            onChange={actions.handleChange}
            onBlur={actions.handleBlur}
            placeholder="e.g. juan@gmail.com"
            className={actions.getInputClass("email")}
            required
          />
          {errors.email && (
            <p
              id="email-error"
              className="text-red-700 text-xs mt-1 font-medium"
            >
              {errors.email}
            </p>
          )}
        </div>

        <BarangayDropdown
          value={formData.barangay}
          onChange={actions.handleChange}
          onBlur={actions.handleBlur}
          error={errors.barangay}
        />

        <div>
          <PasswordInput
            id="password"
            name="password"
            label="Password"
            value={formData.password}
            onChange={actions.handleChange}
            onBlur={actions.handleBlur}
            error={errors.password}
            describedBy="password-rules"
            placeholder="Create a password"
            autoComplete="new-password"
          />
          <PasswordRequirements
            id="password-rules"
            password={formData.password}
          />
        </div>

        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={actions.handleChange}
          onBlur={actions.handleBlur}
          error={errors.confirmPassword}
          placeholder="Re-enter your password"
          autoComplete="new-password"
        />

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
              setTurnstileError("");
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
          <div
            id="security-check-status"
            aria-live="polite"
            className="flex flex-col items-center text-center text-xs"
          >
            {securityStatus === "loading" && !turnstileError && (
              <p className="text-gray-600">
                Running a quick security check before you can register…
              </p>
            )}
            {securityStatus === "failed" && (
              <>
                <p className="font-medium text-red-700">
                  Security check couldn&apos;t load. Check your connection.
                </p>
                <button
                  type="button"
                  onClick={retrySecurityCheck}
                  className="mt-1 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-gray-900 underline underline-offset-4 outline-none hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-gray-900"
                >
                  Try the security check again
                </button>
              </>
            )}
            {turnstileError && securityStatus !== "failed" && (
              <p className="font-medium text-red-700">{turnstileError}</p>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 text-center leading-relaxed">
          Next, we&apos;ll ask for your consent under our{" "}
          <button
            type="button"
            onClick={() => actions.setShowPrivacyModal(true)}
            className={INLINE_LINK_CLASS}
          >
            Privacy Policy
          </button>
          . Creating an account also means you accept our{" "}
          <button
            type="button"
            onClick={() => actions.setShowTermsModal(true)}
            className={INLINE_LINK_CLASS}
          >
            Terms &amp; Conditions
          </button>
          .
        </p>

        {/* Stays focusable while busy so keyboard and screen-reader users keep their place */}
        <button
          id="register-submit"
          type="submit"
          aria-disabled={isSubmitting || !turnstileToken}
          aria-busy={isSubmitting}
          aria-describedby={
            !turnstileToken ? "security-check-status" : undefined
          }
          className="w-full min-h-12 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors aria-disabled:bg-gray-300 aria-disabled:text-gray-800 aria-disabled:hover:bg-gray-300 aria-disabled:cursor-not-allowed flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
        >
          {isSubmitting ? (
            <>
              <Spinner /> Creating account…
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p className="text-sm text-gray-600 text-center mt-6">
        Already have an account?{" "}
        <Link to="/signin" className={LINK_CLASS}>
          Sign In
        </Link>
      </p>

      <p className="text-sm text-gray-600 text-center">
        Need help registering? Contact the MDRRMO at{" "}
        <a
          href="mailto:supportbacolor@gmail.com"
          className={`${LINK_CLASS} whitespace-nowrap`}
        >
          supportbacolor@gmail.com
        </a>
      </p>

      <TermsModal
        isOpen={showTermsModal}
        onClose={() => actions.setShowTermsModal(false)}
      />
      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => actions.setShowPrivacyModal(false)}
      />

      <ExplicitConsentModal
        isOpen={showConsentModal}
        onCancel={() => actions.setShowConsentModal(false)}
        onConfirm={actions.confirmRegistration}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
