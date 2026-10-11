import type { ITheme } from "@xterm/xterm";
import { cssColor } from "@cyberlearn/ui";

/**
 * The colours xterm paints the lesson terminals with.
 *
 * xterm is handed strings and parses them itself: hex and rgb() it reads, a
 * var(--color-*) it does not, and it silently paints its own default in that
 * slot instead (a black screen, a white cursor, its stock ANSI colours). So
 * every entry is a concrete colour, read from the site's tokens under `scope`
 * (the terminal's container, inside the wrapper that carries the reader's
 * cosmetics), with the token's dark value as the fallback.
 */

/**
 * SimulatedTerminal: the screen wears the terminal theme the reader has
 * equipped, the prompt and the cursor their accent. PowerShell keeps its own
 * yellow block cursor.
 */
export function simulatedTerminalTheme(
  shell: "bash" | "powershell",
  scope?: Element | null,
): ITheme {
  const background = cssColor("--cosmetic-terminal-bg", "#030219", scope);
  const accent = cssColor("--cosmetic-accent", "#0AFFD4", scope);
  const info = cssColor("--color-info", "#4D8BFF", scope);
  const cybersec = cssColor("--color-category-cybersec", "#FF4757", scope);
  const primary = cssColor("--color-text-primary", "#F5F5FA", scope);
  return {
    background,
    foreground: cssColor("--cosmetic-terminal-fg", "#B8B5D1", scope),
    cursor: shell === "powershell" ? "#FFFF54" : accent,
    cursorAccent: background,
    black: background,
    green: accent,
    cyan: info,
    red: cybersec,
    yellow: cssColor("--color-warning", "#FFB020", scope),
    white: primary,
    brightBlack: cssColor("--color-text-disabled", "#3F3D5C", scope),
    brightGreen: accent,
    brightCyan: info,
    brightWhite: primary,
    brightRed: cybersec,
    brightYellow: cssColor("--color-rarity-legendary", "#FFB547", scope),
    blue: cssColor("--color-brand-blue", "#0024FF", scope),
    magenta: "#B14DFF",
    brightBlue: cssColor("--color-rarity-rare", "#6E8BFF", scope),
    brightMagenta: "#D580FF",
  };
}

/** LinuxTerminal: the real machine, on the site's own background and palette. */
export function linuxTerminalTheme(scope?: Element | null): ITheme {
  const background = cssColor("--color-bg-base", "#030219", scope);
  const turquoise = cssColor("--color-brand-turquoise", "#0AFFD4", scope);
  const rare = cssColor("--color-rarity-rare", "#6E8BFF", scope);
  const info = cssColor("--color-info", "#4D8BFF", scope);
  const cybersec = cssColor("--color-category-cybersec", "#FF4757", scope);
  const primary = cssColor("--color-text-primary", "#F5F5FA", scope);
  return {
    background,
    foreground: cssColor("--color-text-secondary", "#B8B5D1", scope),
    cursor: turquoise,
    black: background,
    blue: rare,
    brightBlue: rare,
    cyan: info,
    brightCyan: info,
    green: turquoise,
    brightGreen: turquoise,
    red: cybersec,
    brightRed: cybersec,
    yellow: cssColor("--color-warning", "#FFB020", scope),
    brightYellow: cssColor("--color-rarity-legendary", "#FFB547", scope),
    magenta: "#B14DFF",
    brightMagenta: "#D580FF",
    white: primary,
    brightWhite: primary,
    brightBlack: cssColor("--color-text-disabled", "#3F3D5C", scope),
  };
}
