import { useState, useEffect } from "react";

/**
 * A custom React hook that debounces a rapidly changing value.
 * Useful for delaying API calls until the user has stopped typing.
 * 
 * @param {any} value The value to debounce (e.g., search input state)
 * @param {number} delay The delay in milliseconds
 * @returns {any} The debounced value
 */
export default function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if the value changes before the delay is reached
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
