// Shared design tokens for the Settings UI, applied via inline styles because
// generic class names (.card, .btn) collide with existing global styles in
// globals.css. The values are Bastion's: carbon and panel surfaces, chalk for
// a choice, the equipped accent for an action. The drawer re-declares the
// --color-* variables they read (settings-bastion.css).

export const S = {
  base: "var(--color-bg-base)",
  panel: "#121418",
  elev: "var(--color-bg-elevated)",
  overlay: "#191c22",
  chalk: "#eae7df",
  ink: "#141518",
  fg: "var(--color-text-primary)",
  fg2: "var(--color-text-secondary)",
  muted: "var(--color-text-muted)",
  /** The accent as a fill or a line. */
  accent: "var(--cosmetic-accent)",
  /** The accent as text on carbon. */
  accentText: "var(--cosmetic-accent-hover)",
  /** The accent as text on chalk. */
  accentInk: "var(--cosmetic-accent-ink)",
  /** Text on an accent fill. */
  onAccent: "#0b0c0e",
  success: "var(--color-state-success)",
  warning: "var(--color-state-warning)",
  danger: "var(--color-state-danger)",
  border: "var(--color-border-default)",
  borderSoft: "#303137",
  borderStrong: "#74767d",
  disabled: "var(--color-text-faint)",
} as const;

/** Code and data only: a code, a count, a reference. Never a label. */
export const MONO = "var(--font-mono)";
export const SANS = "var(--font-interface), sans-serif";
export const DISPLAY = "var(--font-display), sans-serif";
export const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
