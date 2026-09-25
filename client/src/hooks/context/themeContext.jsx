import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext({
  theme: "light",
  themeMode: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

const getSystemTheme = () => {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
};

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("bacolor_theme") : null;
    if (saved === "dark" || saved === "light" || saved === "system") return saved;
    return "light";
  });

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // Listen to OS theme changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const effectiveTheme = themeMode === "system" ? systemTheme : themeMode;

  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("bacolor_theme", themeMode);
  }, [effectiveTheme, themeMode]);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const current = prev === "system" ? getSystemTheme() : prev;
      return current === "dark" ? "light" : "dark";
    });
  }, []);

  const setTheme = useCallback((mode) => {
    if (mode === "dark" || mode === "light" || mode === "system") {
      setThemeMode(mode);
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: effectiveTheme,
        themeMode,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);