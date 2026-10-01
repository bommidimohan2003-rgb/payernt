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
    } else {
      effectiveTheme = mode;
    }

    setResolvedTheme(effectiveTheme);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", effectiveTheme === "dark");
    }
  }, []);

  useEffect(() => {
    const stored = storage.get<ThemeMode>(STORAGE_KEYS.theme, "system");
    setThemeModeState(stored);
    applyTheme(stored);

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
      setThemeModeState(nextMode);
      storage.set(STORAGE_KEYS.theme, nextMode);
      applyTheme(nextMode);
    },
    [applyTheme]
  );

  const toggle = useCallback(() => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  }, [setThemeMode]);

  return {
    theme: resolvedTheme,
    themeMode,
    setThemeMode,
    toggle,
  };
}
