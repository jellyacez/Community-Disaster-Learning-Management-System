import { useState, useMemo, useEffect, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";
import { VALID_BARANGAY_NAMES } from "../../../constants/barangays";

// Searchable list that only ever hands a barangay name from the list to onChange ("" until one is picked)
const BarangayDropdown = memo(function BarangayDropdown({ value, onChange, onBlur, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Keep the typed text in step when the parent sets or clears the value
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (value) setQuery(value);
  }

  const { data: barangays = VALID_BARANGAY_NAMES } = useQuery({
    queryKey: ["barangays"],
    queryFn: async () => {
      const res = await apiClient.get("/public/barangays");

      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
    select: (data) =>
      data
        .map((b) => (typeof b === "string" ? b : b?.name || b?.barangay_name))
        .filter(Boolean),
    placeholderData: VALID_BARANGAY_NAMES,
  });

  const filteredBarangays = useMemo(() => {
    // Showing the picked name shouldn't narrow the list down to just that one
    const search = query === value ? "" : query.trim().toLowerCase();
    return barangays.filter((b) => b.toLowerCase().includes(search));
  }, [query, value, barangays]);

  const showList = isOpen && filteredBarangays.length > 0;
  const activeId = showList && activeIndex >= 0 ? `barangay-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const emit = (name) => onChange({ target: { name: "barangay", value: name } });

  const select = (name) => {
    setQuery(name);
    setIsOpen(false);
    setActiveIndex(-1);
    if (name !== value) emit(name);
  };

  const handleType = (text) => {
    setQuery(text);
    setIsOpen(true);
    setActiveIndex(text.trim() ? 0 : -1);
    // Typing a name in full counts as picking it; anything else isn't a barangay yet
    const exact = barangays.find((b) => b.toLowerCase() === text.trim().toLowerCase()) || "";
    if (exact !== value) emit(exact);
  };

  const handleKeyDown = (e) => {
    const count = filteredBarangays.length;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        if (count) setActiveIndex((i) => (i + 1) % count);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        if (count) setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
        break;
      case "Enter":
        // Picks the highlighted barangay instead of submitting the form
        if (showList && activeIndex >= 0) {
          e.preventDefault();
          select(filteredBarangays[activeIndex]);
        }
        break;
      case "Escape":
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          setActiveIndex(-1);
        }
        break;
      default:
        break;
    }
  };

  const getInputClass = () => {
    const baseClass = "w-full px-4 py-3 rounded-xl border outline-none transition-colors placeholder:text-gray-500";
    return `${baseClass} ${
      error
        ? "border-red-600 focus:ring-2 focus:ring-red-600 bg-red-50 text-red-900"
        : "border-gray-500 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/50"
    }`;
  };

  return (
    <div className="relative">
      <label htmlFor="barangay" className="block text-sm font-semibold text-gray-700 mb-1">
        Barangay
      </label>
      <input
        id="barangay"
        type="text"
        name="barangay"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls="barangay-listbox"
        aria-activedescendant={activeId}
        aria-invalid={!!error}
        aria-describedby={error ? "barangay-error" : undefined}
        value={query}
        onChange={(e) => handleType(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setTimeout(() => {
            setIsOpen(false);
            setActiveIndex(-1);
          }, 150);
          // Report the picked barangay, not the search text
          onBlur?.({ target: { name: "barangay", value } });
        }}
        placeholder="Type to search, then pick one"
        className={getInputClass()}
        required
        autoComplete="off"
      />
      {error && <p id="barangay-error" className="text-red-700 text-xs mt-1 font-medium">{error}</p>}

      {isOpen && filteredBarangays.length === 0 && (
        <p role="status" className="mt-1 text-xs font-medium text-gray-700">
          No barangay matches &ldquo;{query.trim()}&rdquo;. Check the spelling.
        </p>
      )}

      {/* tabIndex -1 keeps the scrolling list out of the Tab order, so focus never lands on it and vanishes */}
      <ul
        id="barangay-listbox"
        role="listbox"
        aria-label="Barangays"
        tabIndex={-1}
        hidden={!showList}
        className="absolute z-10 w-full bg-white border border-gray-300 rounded-xl mt-1 max-h-60 overflow-y-auto shadow-lg py-1"
      >
        {filteredBarangays.map((b, i) => (
          <li
            key={b}
            id={`barangay-option-${i}`}
            role="option"
            aria-selected={b === value}
            onPointerDown={(e) => {
              e.preventDefault(); // Keep focus in the input
              select(b);
            }}
            onClick={() => select(b)}
            onMouseEnter={() => setActiveIndex(i)}
            className={`flex min-h-11 items-center px-4 cursor-pointer text-sm ${
              i === activeIndex ? "bg-gray-200 text-gray-900" : "text-gray-700"
            } ${b === value ? "font-semibold" : ""}`}
          >
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
});

export default BarangayDropdown;
