import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import PasswordInput from "../inputs/PasswordInput";
import OtpInput from "../inputs/OtpInput";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { authClient } from "../../../lib/auth-client";
import toast from "react-hot-toast";
import axios from "axios";

export default function MfaSetupModal({
  isOpen,
  onClose,
  modalMode,
  totpURI,
  backupCodes,
  password,
  setPassword,
  isGenerating,
  onEnable, // This is for TOTP enable
  onDisable,
  onDone,
}) {
  const [setupStep, setSetupStep] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [hasAcknowledgedBackup, setHasAcknowledgedBackup] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  
  const { data: session } = authClient.useSession();
  const userEmail = session?.user?.email;

  const maskEmail = (email) => {
    if (!email) return "";
    const [localPart, domain] = email.split("@");
    if (!domain) return email;
    if (localPart.length <= 2) return `${localPart[0]}***@${domain}`;
    return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
  };

  useEffect(() => {
    if (isOpen) {
      const checkProvider = async () => {
        try {
          const res = await axios.get("http://localhost:5000/api/users/me/provider", {
            withCredentials: true,
          });
          const providers = res.data.providers || [];
          if (providers.includes("google") && !providers.includes("credential")) {
            setIsGoogleUser(true);
          }
        } catch (err) {
          console.error("Failed to fetch auth provider", err);
        }
      };
      checkProvider();
    }
  }, [isOpen]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen) return null;

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    setSetupStep(1);
    setPassword("");
    setOtpSent(false);
    setOtpCode("");
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
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
      try {
        const res = await fetch("http://localhost:5000/api/auth/enable-email-mfa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include"
        });
        setIsSendingOtp(false);
        if (!res.ok) {
          toast.error("Verified, but failed to update account settings.");
        } else {
          toast.success("Email Authentication Enabled Successfully!");
          onDone();
        }
      } catch (err) {
        setIsSendingOtp(false);
        toast.error("Verified, but failed to connect to server.");
      }
    }
  };

  const extractSecret = (uri) => {
    if (!uri) return "";
    try {
      const url = new URL(uri);
      return url.searchParams.get("secret") || "";
    } catch {
      return "";
    }
  };

  const renderInitialChoice = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-6">
        Choose how you want to receive your secondary verification codes.
      </p>
      
      <button 
        onClick={() => !isGoogleUser && handleSelectMethod("totp")}
        disabled={isGoogleUser}
        className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-colors text-left ${
          isGoogleUser 
            ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed" 
            : "border-gray-200 hover:border-red-300 hover:bg-red-50"
        }`}
      >
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${isGoogleUser ? "bg-gray-200 text-gray-500" : "bg-red-100 text-red-600"}`}>
          <HugeiconsIcon icon={Shield01Icon} className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-gray-900">Use an Authenticator App</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            (Recommended for advanced users). Use apps like Google Authenticator or Authy to generate offline codes.
            {isGoogleUser && <span className="block mt-1 text-red-600 font-semibold">Unavailable for Google OAuth accounts (requires an account password).</span>}
          </p>
        </div>
      </button>

      <button 
        onClick={() => handleSelectMethod("otp")}
        className="w-full flex items-start gap-4 p-4 rounded-2xl border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors text-left"
      >
        <div className="bg-red-100 p-2.5 rounded-xl text-red-600 flex-shrink-0">
          <HugeiconsIcon icon={Mail01Icon} className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-gray-900">Use Email Authentication</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            (Recommended for standard residents). Receive a 6-digit verification code in your email inbox every time you log in.
          </p>
        </div>
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h3 className="text-lg font-bold text-gray-900">
            {modalMode === "enable" ? "Set up Two-Factor Auth" : "Disable Two-Factor Auth"}
          </h3>
          <button 
            onClick={() => {
              setSetupStep(0);
              onClose();
            }} 
            className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {modalMode === "enable" && setupStep === 0 && renderInitialChoice()}

          {modalMode === "enable" && setupStep === 1 && selectedMethod === "totp" && !totpURI ? (
            <form onSubmit={onEnable} className="space-y-5 animate-in slide-in-from-right-4">
              <button 
                type="button" 
                onClick={() => setSetupStep(0)}
                className="text-sm text-red-600 font-bold mb-2 hover:underline"
              >
                &larr; Back to options
              </button>
              {!isGoogleUser ? (
                <>
                  <p className="text-sm text-gray-600">
                    To enable the Authenticator App, please verify your identity by entering your current password.
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
                  <p className="text-sm text-gray-600 leading-relaxed mb-1">
                    Since you signed in with Google, we need to verify your identity before enabling Two-Factor Authentication.
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Click Continue Setup to generate your secure authenticator QR code.
                  </p>
                </div>
              )}
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full rounded-xl bg-red-600 text-white px-6 py-3.5 text-sm font-bold hover:bg-red-700 transition-colors active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Verifying..." : "Continue Setup"}
              </button>
            </form>
          ) : modalMode === "enable" && setupStep === 1 && selectedMethod === "totp" && totpURI ? (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-gray-900 mb-1">
                  1. Scan QR Code or Enter Key
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Open your Authenticator app and scan this code, or enter the text key manually.
                </p>
                <div className="bg-white p-3 rounded-xl shadow-sm inline-block border border-gray-100 mb-3">
                  <QRCodeSVG value={totpURI} size={160} />
                </div>
                <div className="bg-gray-200/50 px-4 py-2 rounded-lg mt-2 w-full max-w-full">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Manual Entry Key</p>
                  <p className="font-mono text-sm font-bold text-gray-800 tracking-widest break-all">{extractSecret(totpURI)}</p>
                </div>
              </div>

              {backupCodes && backupCodes.length > 0 && (
                <div className="p-5 bg-red-50 border border-red-100 rounded-2xl">
                  <p className="text-sm font-bold text-red-900 mb-1">2. Save Backup Codes</p>
                  <p className="text-xs text-red-700 mb-4 leading-relaxed">
                    If you lose access to your authenticator app, these codes are the only way to log in. 
                    Store them somewhere extremely safe.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-red-900 font-mono mb-4">
                    {backupCodes.map((code, idx) => (
                      <div key={idx} className="bg-white/80 px-3 py-1.5 rounded text-center font-bold tracking-widest border border-red-100 shadow-sm">{code}</div>
                    ))}
                  </div>
                  
                  <label className="flex items-start gap-3 mt-4 cursor-pointer group">
                    <div className="relative flex items-center justify-center pt-0.5">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={hasAcknowledgedBackup}
                        onChange={(e) => setHasAcknowledgedBackup(e.target.checked)}
                      />
                      <div className="w-5 h-5 border-2 border-red-200 rounded peer-checked:bg-red-600 peer-checked:border-red-600 transition-colors"></div>
                      <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-red-900 group-hover:text-red-700 transition-colors">
                      I have securely saved these backup codes and successfully scanned the QR code into my app.
                    </span>
                  </label>
                </div>
              )}

              <button
                onClick={onDone}
                disabled={!hasAcknowledgedBackup}
                className="w-full rounded-xl bg-gray-900 text-white px-6 py-3.5 text-sm font-bold hover:bg-black transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete Setup
              </button>
            </div>
          ) : modalMode === "enable" && setupStep === 1 && selectedMethod === "otp" ? (
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
                          onClick={handleSendOtp}
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
          ) : modalMode === "disable" ? (
            <form onSubmit={onDisable} className="space-y-5">
                <p className="text-sm text-gray-600">
                Are you sure you want to disable Two-Factor Authentication? Your account will be significantly less secure against unauthorized access.
              </p>
              {!isGoogleUser && (
                <PasswordInput
                  id="mfaDisablePassword"
                  name="mfaDisablePassword"
                  label="Current Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={false}
                />
              )}
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full rounded-xl border border-red-200 bg-white text-red-600 px-6 py-3.5 text-sm font-bold hover:bg-red-50 transition-colors active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Disabling..." : "Disable MFA"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
