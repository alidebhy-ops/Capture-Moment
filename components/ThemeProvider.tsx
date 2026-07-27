"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  THEME_ACCENT_COOKIE,
  THEME_MODE_COOKIE,
  type ResolvedTheme,
  type ThemeAccent,
  type ThemeMode,
} from "@/lib/theme";

type ThemeContextValue = {
  mode: ThemeMode;
  accent: ThemeAccent;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: ThemeAccent) => void;
  resetTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function updateBrowserChrome(theme: ResolvedTheme) {
  const color = theme === "dark" ? "#171512" : "#f7f3ec";
  const themeColors = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]'
  );

  themeColors.forEach((themeColor) => {
    themeColor.content = color;
  });
}

function applyTheme(
  mode: ThemeMode,
  accent: ThemeAccent
): ResolvedTheme {
  const resolvedTheme = resolveTheme(mode);
  const root = document.documentElement;

  root.dataset.theme = mode;
  root.dataset.accent = accent;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme =
    mode === "system" ? "light dark" : resolvedTheme;
  updateBrowserChrome(resolvedTheme);

  return resolvedTheme;
}

function persistTheme(mode: ThemeMode, accent: ThemeAccent) {
  const cookieOptions = `Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  document.cookie = `${THEME_MODE_COOKIE}=${mode}; ${cookieOptions}`;
  document.cookie = `${THEME_ACCENT_COOKIE}=${accent}; ${cookieOptions}`;
}

export default function ThemeProvider({
  children,
  initialMode,
  initialAccent,
}: {
  children: React.ReactNode;
  initialMode: ThemeMode;
  initialAccent: ThemeAccent;
}) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [accent, setAccentState] =
    useState<ThemeAccent>(initialAccent);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    initialMode === "dark" ? "dark" : "light"
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const syncSystemTheme = () => {
      setResolvedTheme(applyTheme(mode, accent));
    };

    syncSystemTheme();
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, [accent, mode]);

  const setMode = useCallback(
    (nextMode: ThemeMode) => {
      setModeState(nextMode);
      setResolvedTheme(applyTheme(nextMode, accent));
      persistTheme(nextMode, accent);
    },
    [accent]
  );

  const setAccent = useCallback(
    (nextAccent: ThemeAccent) => {
      setAccentState(nextAccent);
      setResolvedTheme(applyTheme(mode, nextAccent));
      persistTheme(mode, nextAccent);
    },
    [mode]
  );

  const resetTheme = useCallback(() => {
    const nextMode: ThemeMode = "system";
    const nextAccent: ThemeAccent = "terracotta";
    setModeState(nextMode);
    setAccentState(nextAccent);
    setResolvedTheme(applyTheme(nextMode, nextAccent));
    persistTheme(nextMode, nextAccent);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      accent,
      resolvedTheme,
      setMode,
      setAccent,
      resetTheme,
    }),
    [accent, mode, resetTheme, resolvedTheme, setAccent, setMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme harus digunakan di dalam ThemeProvider.");
  }
  return context;
}
