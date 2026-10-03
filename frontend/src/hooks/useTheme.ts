import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS, storage } from "@/utils/storage";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function useTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  const applyTheme = useCallback((mode: ThemeMode) => {
    let effectiveTheme: ResolvedTheme = "dark";

    if (mode === "system") {
      if (typeof window !== "undefined") {
        const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        effectiveTheme = isSystemDark ? "dark" : "light";
      }
    } else if (mode === "light" || mode === "dark") {
      effectiveTheme = mode;
    }

    setResolvedTheme(effectiveTheme);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", effectiveTheme === "dark");
    }
  }, []);

  useEffect(() => {
    const stored = storage.get<ThemeMode>(STORAGE_KEYS.theme, "system");
    const validMode: ThemeMode =
      stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setThemeModeState(validMode);
    applyTheme(validMode);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const currentStored = storage.get<ThemeMode>(STORAGE_KEYS.theme, "system");
      if (currentStored === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [applyTheme]);

  const setThemeMode = useCallback(
    (nextMode: ThemeMode) => {
      const validMode: ThemeMode =
        nextMode === "light" || nextMode === "dark" ? nextMode : "system";
      setThemeModeState(validMode);
      storage.set(STORAGE_KEYS.theme, validMode);
      applyTheme(validMode);
    },
    [applyTheme]
  );

  const toggle = useCallback(() => {
    // Read current actual class on <html> as definitive source of truth
    const isCurrentlyDark =
      typeof document !== "undefined"
        ? document.documentElement.classList.contains("dark")
        : resolvedTheme === "dark";

    const nextMode: ThemeMode = isCurrentlyDark ? "light" : "dark";
    setThemeMode(nextMode);
  }, [resolvedTheme, setThemeMode]);

  return {
    theme: resolvedTheme,
    themeMode,
    setThemeMode,
    toggle,
  };
}

export default useTheme;
