import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

export default function PasswordRequirements({ password }) {
  const isLengthValid = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSymbol = /[!@#$%^&*_=+\-/.]/.test(password);

  return (
    <div className="mt-2 space-y-1.5 px-1">
      <div className={`text-xs flex items-center gap-1.5 transition-colors duration-300 font-medium ${isLengthValid ? 'text-green-600' : 'text-gray-500'}`}>
        <HugeiconsIcon icon={isLengthValid ? CheckmarkCircle02Icon : Alert01Icon} className="w-4 h-4" /> 
        At least 8 characters
      </div>
      <div className={`text-xs flex items-center gap-1.5 transition-colors duration-300 font-medium ${hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
        <HugeiconsIcon icon={hasUppercase ? CheckmarkCircle02Icon : Alert01Icon} className="w-4 h-4" /> 
        At least 1 uppercase letter
      </div>
      <div className={`text-xs flex items-center gap-1.5 transition-colors duration-300 font-medium ${hasSymbol ? 'text-green-600' : 'text-gray-500'}`}>
        <HugeiconsIcon icon={hasSymbol ? CheckmarkCircle02Icon : Alert01Icon} className="w-4 h-4" /> 
        At least 1 special symbol
      </div>
    </div>
  );
}
