// Shared design tokens for the Settings UI, mirrored from the original
// settings mockup (the `.settings` palette), since removed. Kept as TS
// constants applied via inline styles because the design's generic class names
// (.card, .btn) collide with existing global styles in globals.css.

export const S = {
  base: "var(--color-bg-base)",
  elev: "var(--color-bg-elevated)",
  overlay: "#191c22",
  fg: "var(--color-text-primary)",
  fg2: "var(--color-text-secondary)",
  muted: "var(--color-text-muted)",
  blue: "var(--color-brand-blue)",
  blueHover: "#ff864f",
  turq: "var(--cosmetic-accent)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
  border: "var(--color-border-default)",
  borderSoft: "#303137",
  borderStrong: "#74767d",
  disabled: "var(--color-text-faint)",
} as const;

export const MONO = "var(--font-mono)";
export const SANS = "var(--font-interface), sans-serif";
export const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
