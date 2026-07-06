import { useState, useMemo, memo } from "react";
import { BACOLOR_BARANGAYS } from "../../../constants/locations";

const BarangayDropdown = memo(function BarangayDropdown({ value, onChange, onBlur, error }) {
  const [showBarangayList, setShowBarangayList] = useState(false);

  const filteredBarangays = useMemo(() => {
    return BACOLOR_BARANGAYS.filter((b) =>
      b.toLowerCase().includes(value.toLowerCase())
    );
  }, [value]);

  const getInputClass = () => {
    const baseClass = "w-full px-4 py-3 rounded-xl border outline-none transition-colors";
    return `${baseClass} ${
      error
        ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 text-red-900"
        : "border-gray-200 focus:ring-2 focus:ring-red-500"
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
        aria-expanded={showBarangayList}
        aria-haspopup="listbox"
        aria-controls="barangay-listbox"
        aria-invalid={!!error}
        aria-describedby={error ? "barangay-error" : undefined}
        value={value}
        onChange={(e) => {
          onChange({ target: { name: "barangay", value: e.target.value } });
          setShowBarangayList(true);
        }}
        onFocus={() => setShowBarangayList(true)}
        onBlur={(e) => {
          if (onBlur) onBlur(e);
          setTimeout(() => setShowBarangayList(false), 200);
        }}
        placeholder="Search or select barangay"
        className={getInputClass()}
        required
        autoComplete="off"
      />
      {error && <p id="barangay-error" className="text-red-500 text-xs mt-1 font-medium">{error}</p>}

      {showBarangayList && (
        <ul id="barangay-listbox" role="listbox" className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg">
          {filteredBarangays.length > 0 ? (
            filteredBarangays.map((b) => (
              <li
                key={b}
                role="option"
                aria-selected={b === value}
                onClick={() => {
                  onChange({ target: { name: "barangay", value: b } });
                  setShowBarangayList(false);
                }}
                className="px-4 py-2 hover:bg-red-50 cursor-pointer text-gray-700 text-sm"
              >
                {b}
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-gray-500 text-sm">No results found</li>
          )}
        </ul>
      )}
    </div>
  );
});

export default BarangayDropdown;
