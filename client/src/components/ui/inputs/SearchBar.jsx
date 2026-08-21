import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  className = "",
  containerClassName = "relative w-full md:max-w-sm",
  inputClassName = "",
  ariaLabel = "Search",
}) {
  return (
    <div className={containerClassName}>
      <HugeiconsIcon
        icon={Search01Icon}
        className="absolute left-3.5 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <label htmlFor="search-input" className="sr-only">
        {ariaLabel}
      </label>
      <input
        id="search-input"
        name="search"
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors ${inputClassName} ${className}`}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
