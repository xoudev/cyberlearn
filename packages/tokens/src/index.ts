// Shared design tokens - plain TS constants, zero deps, safe on web + React Native.
// Derived from packages/ui/src/tokens.css (.dark theme). The app is dark-only.

export const colors = {
  // Surfaces
  bgBase: "#030219",
  bgElevated: "#0a0826",
  bgOverlay: "#110f33",
  // Borders
  borderSubtle: "#1f1b47",
  borderDefault: "#2a2560",
  // Text
  textPrimary: "#f5f5fa",
  textSecondary: "#b8b5d1",
  textMuted: "#6b6890",
  textDisabled: "#3f3d5c",
  // Brand + default cosmetic accent
  brandBlue: "#0024ff",
  brandTurquoise: "#0affd4",
  accent: "#0affd4",
  // Semantic
  success: "#0affd4",
  warning: "#ffb020",
  danger: "#ff4d6d",
  info: "#4d8bff",
  // League movement
  promote: "#34d399",
  relegate: "#ff5b6e",
} as const;

export const rarity = {
  COMMON: "#b8b5d1",
  RARE: "#6e8bff",
  EPIC: "#b14dff",
  LEGENDARY: "#ffb547",
} as const;

export const division = {
  BRONZE: "#c77b3a",
  ARGENT: "#aeb7c7",
  OR: "#ffb547",
  PLATINE: "#7fe3e0",
  DIAMANT: "#0affd4",
} as const;

// Domain accents used by lesson / path cards.
export const category = {
  CYBERSEC: "#ff4757",
  DEV: "#6e8bff",
  NETWORK: "#0affd4",
} as const;

// Selectable cosmetic accents (data-accent overrides in tokens.css).
export const accents = {
  turquoise: "#0affd4",
  blue: "#4d8bff",
  gold: "#ffb547",
  pink: "#ff4dd2",
  violet: "#b14dff",
  green: "#39ff14",
} as const;

export const fonts = {
  sans: "PlusJakartaSans",
  mono: "JetBrainsMono",
} as const;

// The mockup uses square corners; a couple of soft radii exist for pills.
export const radius = {
  none: 0,
  sm: 2,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export type Rarity = keyof typeof rarity;
export type Division = keyof typeof division;
export type CategoryKey = keyof typeof category;
