import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import { authClient } from "../../lib/auth-client";
import OtpInput from "../ui/inputs/OtpInput";

const SEND_FAILED = "We couldn't send the code. Try again.";

export default function MfaSignInForm({ 
  twoFactorMethods, 
  initialMethod, 
  onMethodChange,
  otpAlreadySent = false,
  otpSendFailed = false,
  onCodeSent,
  onCancel, 
  onSuccess 
}) {
  const [twoFactorCurrentMethod, setTwoFactorCurrentMethod] = useState(initialMethod);
  const [totpCode, setTotpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(otpAlreadySent);
  const [countdown, setCountdown] = useState(otpAlreadySent ? 60 : 0);
  const [trustDevice, setTrustDevice] = useState(false);
  const [errors, setErrors] = useState(otpSendFailed ? { form: SEND_FAILED } : {});
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setErrors({});
    const { error } = await authClient.twoFactor.sendOtp();
    setIsSendingOtp(false);
    if (error) {
      setErrors({ form: SEND_FAILED });
      requestAnimationFrame(() => document.getElementById("send-code-button")?.focus());
    } else {
      setOtpSent(true);
      setCountdown(60);
      onCodeSent?.();
      toast.success("Verification code sent to your email!");
    }
  };

  const handleVerifyTwoFactor = async (e, code = totpCode) => {
    e?.preventDefault();
    if (isVerifying) return;
    if (code.length !== 6) {
      setErrors({ form: "Enter all 6 digits of the code.", code: true });
      document.getElementById(`otp-input-${code.length}`)?.focus();
      return;
    }
    setErrors({});
    setIsVerifying(true);
    
    let result;
    if (twoFactorCurrentMethod === "totp") {
      result = await authClient.twoFactor.verifyTotp({ code, trustDevice });
    } else {
      result = await authClient.twoFactor.verifyOtp({ code, trustDevice });
    }

    setIsVerifying(false);

    if (result.error) {
      setErrors({
        form: twoFactorCurrentMethod === "otp"
          ? "That code didn't work. Check it, or send a new one."
          : "That code didn't work. Check it and try again.",
        code: true,
      });
      // Clear the boxes and start again from the first one
      setTotpCode("");
      document.getElementById("otp-input-0")?.focus();
    } else {
      onSuccess();
    }
  };

  const toggleMethod = () => {
    const next = twoFactorCurrentMethod === "totp" ? "otp" : "totp";
    setTwoFactorCurrentMethod(next);
    // Keep the page subtitle in step with the method shown
    onMethodChange?.(next);
    // Switching to email sends the code right away
    if (next === "otp" && !otpSent) handleSendOtp();
    setErrors({});
    setTotpCode("");
  };

  return (
    <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
      {errors.form && (
        <div id="mfa-error" role="alert" className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100">
          <HugeiconsIcon aria-hidden="true" icon={Alert01Icon} className="w-5 h-5 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}
      
      {twoFactorCurrentMethod === "otp" && !otpSent && (
         <div className="mb-4">
            <button
              id="send-code-button"
              type="button"
              autoFocus={otpSendFailed}
              onClick={handleSendOtp}
              disabled={isSendingOtp}
              className="w-full min-h-12 py-3 rounded-xl bg-gray-100 text-gray-800 font-bold hover:bg-gray-200 transition-colors border border-gray-200 outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
            >
              {isSendingOtp ? "Sending..." : "Send Verification Code"}
            </button>
         </div>
      )}

      {((twoFactorCurrentMethod === "otp" && otpSent) || twoFactorCurrentMethod === "totp") && (
        <div>
          <p id="mfa-code-label" className="block text-sm font-semibold text-gray-700 mb-2">
            6-Digit Code
          </p>
          
          <OtpInput
            labelledBy="mfa-code-label"
            align="start"
            describedBy={errors.code ? "mfa-error" : undefined}
            invalid={!!errors.code}
            autoFocus
            value={totpCode}
            onChange={(val) => {
            setTotpCode(val);
            setErrors({});
            // Submit as soon as the sixth digit is typed or pasted
            if (val.length === 6) handleVerifyTwoFactor(null, val);
          }} />

          {twoFactorCurrentMethod === "otp" && otpSent && (
            <div className="mt-3">
              <p className="text-sm text-gray-700">Not there? Check your Spam folder.</p>
              {/* Stays focusable during the countdown so keyboard users can find it */}
              <button
                type="button"
                onClick={() => {
                  if (countdown === 0 && !isSendingOtp) handleSendOtp();
                }}
                aria-disabled={countdown > 0 || isSendingOtp}
                className="-ml-1 inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600 aria-disabled:text-gray-700 aria-disabled:no-underline aria-disabled:cursor-not-allowed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
              >
                {countdown > 0
                  ? `You can send a new code in ${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, "0")}`
                  : isSendingOtp
                    ? "Sending..."
                    : "Send a new code"}
              </button>
              <span className="sr-only" aria-live="polite">
                {countdown === 0 && !isSendingOtp ? "You can now send a new code." : ""}
              </span>
            </div>
          )}

          {/* The whole row is the click target, not just the 20px box */}
          <label htmlFor="trustDevice" className="mt-3 flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              id="trustDevice"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="w-5 h-5 accent-gray-900 rounded border-gray-500 cursor-pointer"
            />
            Remember this device for 30 days
          </label>

          <button
            type="submit"
            aria-disabled={isSendingOtp || isVerifying}
            className="w-full min-h-12 py-3 mt-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors aria-disabled:bg-gray-300 aria-disabled:text-gray-800 aria-disabled:hover:bg-gray-300 aria-disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
          >
            {isVerifying ? "Verifying..." : "Verify Code"}
          </button>
        </div>
      )}

      {twoFactorMethods.length > 1 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={toggleMethod}
            className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600 outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            Use {twoFactorCurrentMethod === "totp" ? "Email Verification" : "Authenticator App"} instead
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="-ml-1 mt-1 flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-gray-700 underline underline-offset-4 hover:text-gray-950 outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
      >
        Cancel
      </button>
    </form>
  );
}
