import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import { authClient } from "../../lib/auth-client";
import OtpInput from "../ui/inputs/OtpInput";

export default function MfaSignInForm({ 
  twoFactorMethods, 
  initialMethod, 
  onCancel, 
  onSuccess 
}) {
  const [twoFactorCurrentMethod, setTwoFactorCurrentMethod] = useState(initialMethod);
  const [totpCode, setTotpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [trustDevice, setTrustDevice] = useState(false);
  const [errors, setErrors] = useState({});
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
      setErrors({ form: error.message || "Failed to send verification code." });
    } else {
      setOtpSent(true);
      setCountdown(60);
      toast.success("Verification code sent to your email!");
    }
  };

  const handleVerifyTwoFactor = async (e) => {
    e.preventDefault();
    if (isVerifying) return;
    setErrors({});
    setIsVerifying(true);
    
    let result;
    if (twoFactorCurrentMethod === "totp") {
      result = await authClient.twoFactor.verifyTotp({ code: totpCode, trustDevice });
    } else {
      result = await authClient.twoFactor.verifyOtp({ code: totpCode, trustDevice });
    }

    setIsVerifying(false);

    if (result.error) {
      setErrors({ form: "Invalid code. Please try again." });
    } else {
      toast.success("Successfully logged in!");
      onSuccess();
    }
  };

  const toggleMethod = () => {
    setTwoFactorCurrentMethod(prev => prev === "totp" ? "otp" : "totp");
    setErrors({});
    setTotpCode("");
  };

  return (
    <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
      {errors.form && (
        <div className="flex items-center justify-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100">
          <HugeiconsIcon aria-hidden="true" icon={Alert01Icon} className="w-5 h-5 flex-shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}
      
      {twoFactorCurrentMethod === "otp" && !otpSent && (
         <div className="mb-4">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={isSendingOtp}
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-800 font-bold hover:bg-gray-200 transition-colors border border-gray-200"
            >
              {isSendingOtp ? "Sending..." : "Send Verification Code"}
            </button>
         </div>
      )}

      {((twoFactorCurrentMethod === "otp" && otpSent) || twoFactorCurrentMethod === "totp") && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
            6-Digit Code
          </label>
          
          <OtpInput value={totpCode} onChange={(val) => {
            setTotpCode(val);
            setErrors({});
          }} />

          {twoFactorCurrentMethod === "otp" && otpSent && (
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={countdown > 0 || isSendingOtp}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 disabled:opacity-50 disabled:hover:text-gray-500 transition-colors"
              >
                {countdown > 0 ? `Send again in 00:${countdown.toString().padStart(2, '0')}` : "Send code again"}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              id="trustDevice"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-600 cursor-pointer"
            />
            <label htmlFor="trustDevice" className="text-sm font-semibold text-gray-700 cursor-pointer">
              Remember this device for 30 days
            </label>
          </div>

          <button
            type="submit"
            disabled={totpCode.length !== 6 || isSendingOtp || isVerifying}
            className="w-full py-3 mt-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isVerifying ? "Verifying..." : "Verify Code"}
          </button>
        </div>
      )}

      {twoFactorMethods.length > 1 && (
        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={toggleMethod}
            className="text-sm font-semibold text-red-600 hover:underline"
          >
            Use {twoFactorCurrentMethod === "totp" ? "Email Verification" : "Authenticator App"} instead
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors mt-2"
      >
        Cancel
      </button>
    </form>
  );
}
