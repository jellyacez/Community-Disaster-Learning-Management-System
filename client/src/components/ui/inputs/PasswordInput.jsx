import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { EyeIcon, EyeOffIcon } from "@hugeicons/core-free-icons";

export default function PasswordInput({
  id,
  name,
  label,
  value,
  onChange,
  error,
  placeholder = "Enter password",
  required = true,
  autoComplete = "current-password"
}) {
  const [showPassword, setShowPassword] = useState(false);

  const baseClass = "w-full px-4 py-3 rounded-xl border outline-none transition-colors";
  const inputClass = `${baseClass} ${
    error
      ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 text-red-900"
      : "border-gray-200 focus:ring-2 focus:ring-red-500"
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
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${inputClass} pr-12`}
          required={required}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          {showPassword ? (
            <HugeiconsIcon icon={EyeOffIcon} className="w-5 h-5" />
          ) : (
            <HugeiconsIcon icon={EyeIcon} className="w-5 h-5" />
          )}
        </button>
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>
      )}
    </div>
  );
}
