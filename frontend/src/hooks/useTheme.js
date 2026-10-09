import { useContext } from "react";
import ThemeContext from "../context/ThemeContext.jsx";

/**
 * Shared Epex Bank theme hook.
 *
 * Supports both:
 *   import { useTheme } from "../hooks/useTheme.js";
 *
 * and:
 *   import useTheme from "../hooks/useTheme.js";
 *
 * The actual theme state is owned by ThemeContext so every component
 * remains synchronized.
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside a ThemeProvider.",
    );
  }

  return context;
};

export default useTheme;