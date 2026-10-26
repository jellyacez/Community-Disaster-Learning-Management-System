import { useOfflineSession } from "../offlineSession";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import { saveOfflineNotification } from "../../lib/LocalSave/progressService";

const ThemeContext = createContext({
  theme: "light",
  themeMode: "light",
  toggleTheme: () => {},
  setTheme: () => {},
  resetTheme: () => {},
  isPortal: false,
});

const getSystemTheme = () => {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
};

export function ThemeProvider({ children }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: session, isOffline } = useOfflineSession();
  const userId = session?.user?.id;

  // Dark mode is restricted exclusively to authenticated user/admin portals.
  // Public facing pages (e.g. landing page, sign in, register, privacy policy) must never be affected.
  const isPortalRoute =
    location.pathname.startsWith("/user") ||
    location.pathname.startsWith("/admin");
  const isAuthenticatedPortal = Boolean(isPortalRoute && session);

  // Restore preference on every entry route, including / before AppEntry redirects.
  // Public pages remain light through effectiveTheme below.
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = localStorage.getItem("bacolor_theme");
      return ["dark", "light", "system"].includes(saved)
        ? saved
        : "light";
    } catch {
      return "light";
    }
  });

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const hydratedForUserRef = useRef(null);

  // Fetch persisted settings from the database when inside an authenticated portal
  const { data: userSettings } = useQuery({
    queryKey: ["userSettings"],
    queryFn: async () => {
      const response = await apiClient.get("/users/me/settings");
      return response.data;
    },
    enabled: Boolean(isAuthenticatedPortal && userId && !isOffline),
    staleTime: 1000 * 60 * 5,
  });

  // Hydrate theme preference from DB whenever user logs in or portal mounts
  useEffect(() => {
    if (!isOffline && isAuthenticatedPortal && userId && userSettings?.theme) {
      const dbTheme = userSettings.theme;
      if (dbTheme === "dark" || dbTheme === "light" || dbTheme === "system") {
        if (hydratedForUserRef.current !== userId) {
          hydratedForUserRef.current = userId;
          setThemeMode(dbTheme);
          localStorage.setItem("bacolor_theme", dbTheme);
        }
      }
    }
  }, [isOffline, isAuthenticatedPortal, userId, userSettings?.theme]);

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

  // Dark mode only takes effect when inside an authenticated portal route WITH an active session.
  // Public-facing routes (landing, sign-in, register, privacy policy) are strictly locked to light mode.
  const effectiveTheme =
    isAuthenticatedPortal &&
    (themeMode === "system" ? systemTheme : themeMode) === "dark"
      ? "dark"
      : "light";

  useLayoutEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      effectiveTheme === "dark"
    );
  }, [effectiveTheme]);

  const persistTheme = useCallback(
    async (mode) => {
      if (!userId) return;
      try {
        // Optimistically update React Query cache so settings are unified
        queryClient.setQueryData(["userSettings"], (prev) => ({
          ...(prev || {}),
          theme: mode,
        }));

        if (!navigator.onLine) {
          await saveOfflineNotification(userId, {
            ...(queryClient.getQueryData(["userSettings"]) || {}),
            theme: mode,
          });
          return;
        }

        await apiClient.put("/users/me/settings", { theme: mode });
      } catch (err) {
        console.warn(
          "[ThemeContext] Failed to persist theme to database:",
          err,
        );
      }
    },
    [userId, queryClient],
  );

  const resetTheme = useCallback(() => {
    hydratedForUserRef.current = null;
    setThemeMode("light");
    if (typeof window !== "undefined") {
      localStorage.removeItem("bacolor_theme");
      document.documentElement.classList.remove("dark");
    }
    queryClient.removeQueries({ queryKey: ["userSettings"] });
  }, [queryClient]);

  const setTheme = useCallback(
    (mode) => {
      if (mode === "dark" || mode === "light" || mode === "system") {
        hydratedForUserRef.current = userId;
        setThemeMode(mode);

        if (isAuthenticatedPortal) {
          localStorage.setItem("bacolor_theme", mode);
          persistTheme(mode);
        }
      }
    },
    [isAuthenticatedPortal, persistTheme, userId],
  );

  const toggleTheme = useCallback(() => {
    if (!isPortalRoute) return;
    const currentResolved =
      (themeMode === "system" ? systemTheme : themeMode) === "dark"
        ? "dark"
        : "light";
    const next = currentResolved === "dark" ? "light" : "dark";
    setTheme(next);
  }, [isPortalRoute, themeMode, systemTheme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme: effectiveTheme,
        themeMode,
        toggleTheme,
        setTheme,
        resetTheme,
        isPortal: isPortalRoute,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);
