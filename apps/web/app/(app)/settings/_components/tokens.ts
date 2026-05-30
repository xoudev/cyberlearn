// Shared design tokens for the Settings UI, mirrored from
// docs/design/settings/settings.css (the `.settings` palette). Kept as TS
// constants applied via inline styles because the design's generic class names
// (.card, .btn) collide with existing global styles in globals.css.

export const S = {
  base: "#030219",
  elev: "#0A0826",
  overlay: "#110F33",
  fg: "#F5F5FA",
  fg2: "#B8B5D1",
  muted: "#6B6890",
  blue: "#0024FF",
  blueHover: "#1F3BFF",
  turq: "#0AFFD4",
  warning: "#FFB020",
  danger: "#FF4D6D",
  info: "#4D8BFF",
  border: "#2A2560",
  borderSoft: "#1A1640",
  borderStrong: "#3D3785",
  disabled: "#44406B",
} as const;

export const MONO = "var(--font-mono)";
export const SANS = "var(--font-sans)";
export const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
