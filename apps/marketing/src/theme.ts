import { category, colors } from "@cyberlearn/tokens";

export const palette = {
  ...colors,
  category,
  grid: "rgba(42, 37, 96, 0.34)",
  accentSoft: "rgba(10, 255, 212, 0.12)",
  blueSoft: "rgba(0, 36, 255, 0.18)",
} as const;

export const fonts = {
  sans: '"Plus Jakarta Sans", sans-serif',
  mono: '"JetBrains Mono", monospace',
} as const;
