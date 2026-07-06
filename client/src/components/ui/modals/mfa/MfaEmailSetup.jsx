import { useState, useEffect } from "react";
import PasswordInput from "../../inputs/PasswordInput";
import OtpInput from "../../inputs/OtpInput";
import { authClient } from "../../../../lib/auth-client";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";

export default function MfaEmailSetup({
  isGoogleUser,
  setSetupStep,
  password,
  setPassword,
  userEmail,
  onDone
}) {
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const maskEmail = (email) => {
    if (!email) return "";
    const [localPart, domain] = email.split("@");
    if (!domain) return email;
    if (localPart.length <= 2) return `${localPart[0]}***@${domain}`;
    return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setIsSendingOtp(true);
    const { error } = await authClient.twoFactor.sendOtp();
    setIsSendingOtp(false);
    
    if (error) {
      toast.error(error.message || "Failed to send OTP.");
    } else {
      setOtpSent(true);
      setCountdown(60);
      toast.success("Verification code sent to your email!");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;
    
    setIsSendingOtp(true);
    const { error } = await authClient.twoFactor.verifyOtp({ code: otpCode });
    
    if (error) {
      toast.error("Invalid code.");
      setIsSendingOtp(false);
    } else {
      toast.success("Email Authentication Enabled Successfully!");
      onDone();
    }
  };

  return (
    <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-5 animate-in slide-in-from-right-4">
      <button 
        type="button" 
        onClick={() => setSetupStep(0)}
        className="text-sm text-red-600 font-bold mb-2 hover:underline"
      >
        &larr; Back to options
      </button>
      
      {!otpSent ? (
        <>
          {!isGoogleUser ? (
            <>
              <p className="text-sm text-gray-600">
                To enable Email Authentication, please verify your current password. We will send a 6-digit code to your email.
              </p>
              <PasswordInput
                id="mfaEnablePassword"
                name="mfaEnablePassword"
                label="Current Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={false}
              />
            </>
          ) : (
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-center">
              <h4 className="font-bold text-gray-900 mb-2">Verify Your Identity</h4>
              <p className="text-sm text-gray-600 leading-relaxed mb-2">
                Since you signed in with Google, we need to verify your identity before enabling Two-Factor Authentication. 
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Click below to send a secure 6-digit code to your registered email address <strong className="text-gray-900">({maskEmail(userEmail)})</strong>.
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={isSendingOtp}
            className="w-full rounded-xl bg-red-600 text-white px-6 py-3.5 text-sm font-bold hover:bg-red-700 transition-colors active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSendingOtp ? "Sending Code..." : "Send Verification Code"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            We've sent a 6-digit verification code to your email. Please enter it below to confirm and enable Email OTP.
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
              6-Digit Code
            </label>
            <OtpInput value={otpCode} onChange={setOtpCode} />
            
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={countdown > 0 || isSendingOtp}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 disabled:opacity-50 disabled:hover:text-gray-500 transition-colors"
              >
                {countdown > 0 ? `Send again in 00:${countdown.toString().padStart(2, '0')}` : "Send code again"}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSendingOtp || otpCode.length !== 6}
            className="w-full rounded-xl bg-red-600 text-white px-6 py-3.5 text-sm font-bold hover:bg-red-700 transition-colors active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isSendingOtp ? "Verifying..." : "Verify & Enable"}
          </button>
        </>
      )}
    </form>
  );
}
