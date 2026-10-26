import { useState, memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { EyeIcon, EyeOffIcon } from "@hugeicons/core-free-icons";

const PasswordInput = memo(function PasswordInput({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  // Marks the field as wrong without its own message (e.g. a rejected email/password pair)
  invalid = false,
  // Points at a message shown elsewhere (e.g. a form-level error banner)
  describedBy,
  placeholder = "Enter password",
  required = true,
  autoComplete = "current-password"
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const checkCapsLock = (e) => setCapsLockOn(e.getModifierState?.("CapsLock") ?? false);

  const baseClass = "w-full px-4 py-3 rounded-xl border outline-none transition-colors";
  const inputClass = `${baseClass} ${
    error || invalid
      ? "border-red-600 focus:ring-2 focus:ring-red-600 bg-red-50 text-red-900"
      : "border-gray-500 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/50"
  }`;

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          aria-invalid={!!error || invalid}
          aria-describedby={[error && `${id}-error`, describedBy].filter(Boolean).join(" ") || undefined}
          value={value}
          onChange={onChange}
          onBlur={(e) => {
            setCapsLockOn(false);
            onBlur?.(e);
          }}
          onKeyDown={checkCapsLock}
          onKeyUp={checkCapsLock}
          placeholder={placeholder}
          className={`${inputClass} pr-14 placeholder:text-gray-500`}
          required={required}
        />
        <button
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          {showPassword ? (
            <HugeiconsIcon aria-hidden="true" icon={EyeOffIcon} className="w-5 h-5" />
          ) : (
            <HugeiconsIcon aria-hidden="true" icon={EyeIcon} className="w-5 h-5" />
          )}
        </button>
      </div>
      {/* Always mounted so the hint is announced when it appears */}
      <p aria-live="polite" className={`text-xs font-medium text-gray-700 ${capsLockOn ? "mt-1" : ""}`}>
        {capsLockOn ? "Caps Lock is on." : ""}
      </p>
      {error && (
        <p id={`${id}-error`} className="text-red-700 text-xs mt-1 font-medium">{error}</p>
      )}
    </div>
  );
});

export default PasswordInput;
