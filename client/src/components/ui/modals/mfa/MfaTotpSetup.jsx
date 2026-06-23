import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import PasswordInput from "../../inputs/PasswordInput";
import OtpInput from "../../inputs/OtpInput";
import { authClient } from "../../../../lib/auth-client";
import toast from "react-hot-toast";

export default function MfaTotpSetup({
  isGoogleUser,
  setSetupStep,
  password,
  setPassword,
  onEnable,
  isGenerating,
  totpURI,
  backupCodes,
  onDone
}) {
  const [hasAcknowledgedBackup, setHasAcknowledgedBackup] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyAndComplete = async () => {
    if (totpCode.length !== 6) {
      toast.error("Please enter the 6-digit code from your app.");
      return;
    }
    
    setIsVerifying(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code: totpCode });
    setIsVerifying(false);

    if (error) {
      toast.error(error.message || "Invalid authenticator code. Please try again.");
    } else {
      toast.success("Authenticator App Enabled Successfully!");
      onDone();
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

  if (!totpURI) {
    return (
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
    );
  }

  return (
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

      <div className="pt-2 border-t border-gray-100">
        <label className="block text-sm font-semibold text-gray-900 mb-3 text-center">
          3. Enter 6-Digit Code to Verify
        </label>
        <OtpInput value={totpCode} onChange={setTotpCode} />
      </div>

      <button
        onClick={handleVerifyAndComplete}
        disabled={!hasAcknowledgedBackup || isVerifying || totpCode.length !== 6}
        className="w-full rounded-xl bg-gray-900 text-white px-6 py-3.5 text-sm font-bold hover:bg-black transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isVerifying ? "Verifying..." : "Verify & Complete Setup"}
      </button>
    </div>
  );
}
