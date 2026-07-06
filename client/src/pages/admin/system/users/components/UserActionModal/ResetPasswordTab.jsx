import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon, EyeIcon, EyeOffIcon } from "@hugeicons/core-free-icons";
import PasswordRequirements from "../../../../../../components/auth/PasswordRequirements";

export default function ResetPasswordTab({ user, onSave }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ type: "password", userId: user.id, data: { password } });
  };

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    // Passing empty password triggers the backend to auto-generate and email
    await onSave({ type: "password", userId: user.id, data: { password: "" } });
    setIsGenerating(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-2">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Auto-Generate (Recommended)</label>
        <p className="text-xs text-gray-500 mb-3">Securely generate a new password and email it directly to the user.</p>
        <button
          type="button"
          onClick={handleAutoGenerate}
          disabled={isGenerating}
          className="w-full rounded-xl bg-gray-900 text-white py-3 text-sm font-bold hover:bg-black transition-colors disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Auto-Generate & Email Password"}
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500 font-medium">Or set manually</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
        <div className="relative">
          <HugeiconsIcon icon={Settings01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full pl-9 pr-12 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            placeholder="Min. 8 characters"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-md transition-colors"
          >
            {showPassword ? (
              <HugeiconsIcon aria-hidden="true" icon={EyeOffIcon} className="w-4 h-4" />
            ) : (
              <HugeiconsIcon aria-hidden="true" icon={EyeIcon} className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="mt-2">
          <PasswordRequirements password={password} />
        </div>
        <button
          type="submit"
          disabled={!/^(?=.*[A-Z])(?=.*[!@#$%^&*_=+\-/.]).{8,}$/.test(password)}
          className="w-full rounded-xl bg-amber-600 text-white py-3 text-sm font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 mt-4"
        >
          Manually Reset Password
        </button>
      </div>
    </form>
  );
}
