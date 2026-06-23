import React from "react";
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
  );
}
