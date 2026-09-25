import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon, Mail01Icon } from "@hugeicons/core-free-icons";

export default function MfaInitialChoice({ isGoogleUser, handleSelectMethod }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
        Choose how you want to receive your secondary verification codes.
      </p>
      
      <button 
        onClick={() => !isGoogleUser && handleSelectMethod("totp")}
        disabled={isGoogleUser}
        className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-colors text-left cursor-pointer ${
          isGoogleUser 
            ? "border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 opacity-60 cursor-not-allowed" 
            : "border-gray-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-slate-800"
        }`}
      >
        <div className={`p-2.5 rounded-xl shrink-0 ${isGoogleUser ? "bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-slate-500" : "bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400"}`}>
          <HugeiconsIcon aria-hidden="true" icon={Shield01Icon} className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white">Use an Authenticator App</h4>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
            (Recommended for advanced users). Use apps like Google Authenticator or Authy to generate offline codes.
            {isGoogleUser && <span className="block mt-1 text-red-600 dark:text-red-400 font-semibold">Unavailable for Google OAuth accounts (requires an account password).</span>}
          </p>
        </div>
      </button>

      <button 
        onClick={() => handleSelectMethod("otp")}
        className="w-full flex items-start gap-4 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
      >
        <div className="bg-red-100 dark:bg-red-950/60 p-2.5 rounded-xl text-red-600 dark:text-red-400 shrink-0">
          <HugeiconsIcon aria-hidden="true" icon={Mail01Icon} className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white">Use Email Authentication</h4>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
            (Recommended for standard residents). Receive a 6-digit verification code in your email inbox every time you log in.
          </p>
        </div>
      </button>
    </div>
  );
}
