export const THEME_MODE_COOKIE = "capturemoment_theme";
export const THEME_ACCENT_COOKIE = "capturemoment_accent";

export const themeModes = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof themeModes)[number];

export const themeAccents = [
  {
    id: "terracotta",
    label: "Terracotta",
    description: "Hangat dan akrab, warna khas CaptureMoment.",
    colors: {
      accent: "#b75638",
      deep: "#823922",
      soft: "#f4e5dd",
    },
  },
  {
    id: "sage",
    label: "Sage",
    description: "Tenang dan natural untuk cerita keluarga.",
    colors: {
      accent: "#5c745e",
      deep: "#405b44",
      soft: "#e5ece3",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Sejuk dan jernih seperti album perjalanan.",
    colors: {
      accent: "#456b80",
      deep: "#31556a",
      soft: "#e1ebf0",
    },
  },
  {
    id: "plum",
    label: "Plum",
    description: "Lembut, personal, dan sedikit nostalgik.",
    colors: {
      accent: "#7c5c75",
      deep: "#674a61",
      soft: "#eee3eb",
    },
  },
  {
    id: "amber",
    label: "Amber",
    description: "Cerah dan hangat seperti cahaya sore.",
    colors: {
      accent: "#956022",
      deep: "#784916",
      soft: "#f5e7d4",
    },
  },
] as const;

export type ThemeAccent = (typeof themeAccents)[number]["id"];
export type ResolvedTheme = Exclude<ThemeMode, "system">;

export const DEFAULT_THEME_MODE: ThemeMode = "system";
export const DEFAULT_THEME_ACCENT: ThemeAccent = "terracotta";

export function parseThemeMode(value: string | null | undefined): ThemeMode {
  return themeModes.includes(value as ThemeMode)
    ? (value as ThemeMode)
    : DEFAULT_THEME_MODE;
}

export function parseThemeAccent(
  value: string | null | undefined
): ThemeAccent {
  return themeAccents.some((accent) => accent.id === value)
    ? (value as ThemeAccent)
    : DEFAULT_THEME_ACCENT;
}

export function getThemeAccent(accent: ThemeAccent) {
  return (
    themeAccents.find((option) => option.id === accent) ?? themeAccents[0]
  );
}
