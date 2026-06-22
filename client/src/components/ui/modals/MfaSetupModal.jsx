import React from "react";
import { QRCodeSVG } from "qrcode.react";
import PasswordInput from "../inputs/PasswordInput";

export default function MfaSetupModal({
  isOpen,
  onClose,
  modalMode,
  totpURI,
  backupCodes,
  password,
  setPassword,
  isGenerating,
  onEnable,
  onDisable,
  onDone,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h3 className="text-lg font-bold text-gray-900">
            {modalMode === "enable" ? "Set up Two-Factor Auth" : "Disable Two-Factor Auth"}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {modalMode === "enable" && !totpURI ? (
            <form onSubmit={onEnable} className="space-y-5">
              <p className="text-sm text-gray-600">
                To enable Multi-Factor Authentication, please verify your identity by entering your current password.
              </p>
              <PasswordInput
                id="mfaEnablePassword"
                name="mfaEnablePassword"
                label="Current Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full rounded-xl bg-red-600 text-white px-6 py-3.5 text-sm font-bold hover:bg-red-700 transition-colors active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Verifying..." : "Continue Setup"}
              </button>
            </form>
          ) : modalMode === "enable" && totpURI ? (
            <div className="space-y-6">
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-gray-900 mb-1">
                  1. Scan QR Code
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Open your Authenticator app (e.g., Google Authenticator, Authy) and scan this code.
                </p>
                <div className="bg-white p-3 rounded-xl shadow-sm inline-block border border-gray-100">
                  <QRCodeSVG value={totpURI} size={160} />
                </div>
              </div>

              {backupCodes && backupCodes.length > 0 && (
                <div className="p-5 bg-red-50 border border-red-100 rounded-2xl">
                  <p className="text-sm font-bold text-red-900 mb-1">2. Save Backup Codes</p>
                  <p className="text-xs text-red-700 mb-4 leading-relaxed">
                    If you lose access to your authenticator app, these codes are the only way to log in. 
                    Store them somewhere extremely safe.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-red-900 font-mono">
                    {backupCodes.map((code, idx) => (
                      <div key={idx} className="bg-white/80 px-3 py-1.5 rounded text-center font-bold tracking-widest border border-red-100 shadow-sm">{code}</div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={onDone}
                className="w-full rounded-xl bg-gray-900 text-white px-6 py-3.5 text-sm font-bold hover:bg-black transition-colors active:scale-95"
              >
                I have saved them & scanned the code
              </button>
            </div>
          ) : modalMode === "disable" ? (
            <form onSubmit={onDisable} className="space-y-5">
                <p className="text-sm text-gray-600">
                Are you sure you want to disable Two-Factor Authentication? Your account will be significantly less secure against unauthorized access.
              </p>
              <PasswordInput
                id="mfaDisablePassword"
                name="mfaDisablePassword"
                label="Current Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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
