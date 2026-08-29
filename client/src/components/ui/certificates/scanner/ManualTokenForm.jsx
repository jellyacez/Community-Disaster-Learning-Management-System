import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";

export default function ManualTokenForm({
  tokenInput,
  setTokenInput,
  onSubmit,
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (tokenInput.trim()) {
          onSubmit(tokenInput);
        }
      }}
      className="space-y-4"
    >
      <div>
        <label
          htmlFor="token-input"
          className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
        >
          Verification Token or URL
        </label>
        <div className="relative">
          <input
            id="token-input"
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 font-mono focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none"
            required
            autoFocus
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Paste the 36-character UUID token or the full QR verification URL.
        </p>
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-sm cursor-pointer"
      >
        <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-4 h-4" />
        <span>Verify Token</span>
      </button>
    </form>
  );
}
