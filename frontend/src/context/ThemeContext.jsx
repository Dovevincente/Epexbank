import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "epex-bank-theme";
const DEFAULT_THEME = "system";

const VALID_THEMES = new Set(["light", "dark", "system"]);

const getSystemTheme = () => {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const getStoredTheme = () => {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);

    return VALID_THEMES.has(storedTheme) ? storedTheme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

const resolveTheme = (theme) => {
  if (theme === "system") {
    return getSystemTheme();
  }

  return theme === "dark" ? "dark" : "light";
};

const applyTheme = (resolvedTheme) => {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);

  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
};

const persistTheme = (theme) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  const resolvedTheme =
    theme === "system" ? systemTheme : theme === "dark" ? "dark" : "light";

  const setTheme = useCallback((nextTheme) => {
    const normalizedTheme = String(nextTheme ?? "")
      .trim()
      .toLowerCase();

    if (!VALID_THEMES.has(normalizedTheme)) {
      return;
    }

    setThemeState(normalizedTheme);
    persistTheme(normalizedTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME);
  }, [setTheme]);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (event) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleSystemThemeChange);

      return () => {
        mediaQuery.removeEventListener(
          "change",
          handleSystemThemeChange,
        );
      };
    }

    mediaQuery.addListener(handleSystemThemeChange);

    return () => {
      mediaQuery.removeListener(handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleStorageChange = (event) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      if (!VALID_THEMES.has(event.newValue)) {
        setThemeState(DEFAULT_THEME);
        return;
      }

      setThemeState(event.newValue);
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      isDark: resolvedTheme === "dark",
      isLight: resolvedTheme === "light",
      isSystem: theme === "system",
      themes: ["light", "dark", "system"],
      setTheme,
      toggleTheme,
      resetTheme,
    }),
    [
      theme,
      resolvedTheme,
      systemTheme,
      setTheme,
      toggleTheme,
      resetTheme,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useThemeContext must be used inside a ThemeProvider.",
    );
  }

  return context;
};

export const useTheme = useThemeContext;

export default ThemeContext;
