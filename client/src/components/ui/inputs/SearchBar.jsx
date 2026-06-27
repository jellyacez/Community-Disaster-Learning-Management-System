import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  containerClassName = "relative w-full md:max-w-sm"
}) {
  return (
    <div className={containerClassName}>
      <HugeiconsIcon
        icon={Search01Icon}
        className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400"
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-red-400 transition-colors ${className}`}
      />
    </div>
  );
}
