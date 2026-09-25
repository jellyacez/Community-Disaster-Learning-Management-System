import PasswordInput from "../../inputs/PasswordInput";

export default function MfaDisableForm({
  isGoogleUser,
  onDisable,
  password,
  setPassword,
  isGenerating
}) {
  return (
    <form onSubmit={onDisable} className="space-y-5">
      <p className="text-sm text-gray-600 dark:text-slate-300">
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
        className="w-full rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 px-6 py-3.5 text-sm font-bold hover:bg-red-50 dark:hover:bg-slate-700 transition-colors active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
      >
        {isGenerating ? "Disabling..." : "Disable MFA"}
      </button>
    </form>
  );
}
